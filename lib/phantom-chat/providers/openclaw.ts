/**
 * OpenClaw (self-hosted) provider.
 *
 * Talks to an OpenAI-compatible gateway. Two transports are supported:
 *
 *   - `/v1/responses`        (spec-preferred) — conversation state via a stable
 *                            `user` key plus a replayed `previous_response_id`.
 *   - `/v1/chat/completions` (proven fallback) — conversation state via the
 *                            `x-openclaw-session-key` header, scoped per
 *                            conversation so "New chat" starts fresh.
 *
 * In `auto` mode we try `/v1/responses` first, fall back to chat/completions on
 * 404 / unsupported / unparseable replies, and remember the working endpoint per
 * gateway so subsequent turns skip the failing one. The gateway sometimes
 * answers with text/plain or SSE, so parsing is defensive.
 *
 * Server-side only — the browser must never call the gateway, and the token is
 * never logged.
 */

import { randomUUID } from 'node:crypto'
import type {
  ChatMessage,
  ChatProvider,
  OpenClawSettings,
  SendMessageParams,
  SendMessageResult,
} from '../types'

const RESPONSE_TIMEOUT_MS = 60_000

type ApiMode = 'auto' | 'responses' | 'chat'
type Endpoint = 'responses' | 'chat'

/** Remember the last endpoint that worked for a given gateway (per warm instance). */
const endpointPreference = new Map<string, Endpoint>()

/** Marker error so the route can surface the exact required message/status. */
export class OpenClawEndpointDisabledError extends Error {
  constructor() {
    super('OpenClaw Gateway endpoints not enabled or gateway needs restart.')
    this.name = 'OpenClawEndpointDisabledError'
  }
}

function apiMode(): ApiMode {
  const raw = process.env.OPENCLAW_API_MODE?.trim().toLowerCase()
  return raw === 'responses' || raw === 'chat' ? raw : 'auto'
}

/** Convert ws/wss gateway URLs to http/https and strip a trailing slash. */
function toHttpBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (trimmed.startsWith('wss://')) return `https://${trimmed.slice(6)}`
  if (trimmed.startsWith('ws://')) return `http://${trimmed.slice(5)}`
  return trimmed
}

/** Resolve the stable user key, expanding a `<appUserId>` placeholder. */
function resolveUserKey(template: string, userId: string): string {
  const safeUserId = userId?.trim() || `anon-${randomUUID()}`
  const t = template?.trim() || 'webui:<appUserId>'
  const expanded = t.includes('<appUserId>')
    ? t.replace(/<appUserId>/g, safeUserId)
    : t
  return (
    expanded.toLowerCase().replace(/[^a-z0-9:_-]/g, '-') || `webui-${safeUserId}`
  )
}

function sanitizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9:_-]/g, '-')
}

function latestUserText(messages: ChatMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  return lastUser?.content.trim() ?? ''
}

function transcriptText(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.content.trim())
    .map((m) => {
      const label =
        m.role === 'assistant'
          ? 'Assistant'
          : m.role === 'system'
            ? 'System'
            : 'User'
      return `${label}: ${m.content.trim()}`
    })
    .join('\n\n')
}

/** Strip the token from any string so it can never leak into logs/errors. */
function redact(input: string, token: string): string {
  if (!token) return input
  return input.split(token).join('***REDACTED***')
}

interface Extracted {
  text: string
  id?: string
}

/** Pull assistant text + response id out of a parsed gateway object. */
function extractFromObject(obj: unknown): Extracted {
  if (!obj || typeof obj !== 'object') return { text: '' }
  const d = obj as Record<string, unknown>

  // SSE "completed" envelope wraps the real response.
  if (d.response && typeof d.response === 'object') {
    const inner = extractFromObject(d.response)
    if (inner.text || inner.id) return inner
  }

  const id = typeof d.id === 'string' ? d.id : undefined

  // /v1/responses convenience field.
  if (typeof d.output_text === 'string' && d.output_text.trim()) {
    return { text: d.output_text.trim(), id }
  }

  // /v1/responses structured output.
  if (Array.isArray(d.output)) {
    const chunks: string[] = []
    for (const item of d.output) {
      const content = (item as { content?: unknown })?.content
      if (!Array.isArray(content)) continue
      for (const part of content) {
        const p = part as { type?: string; text?: unknown }
        if (
          (p?.type === 'output_text' || p?.type === 'text') &&
          typeof p.text === 'string'
        ) {
          chunks.push(p.text.trim())
        }
      }
    }
    if (chunks.length) return { text: chunks.filter(Boolean).join('\n\n'), id }
  }

  // /v1/chat/completions shape.
  const choices = d.choices
  if (Array.isArray(choices) && choices.length) {
    const content = (choices[0] as { message?: { content?: unknown } })?.message
      ?.content
    if (typeof content === 'string' && content.trim()) {
      return { text: content.trim(), id }
    }
    if (Array.isArray(content)) {
      const text = content
        .filter(
          (p): p is { text: string } =>
            !!p && typeof (p as { text?: unknown }).text === 'string'
        )
        .map((p) => p.text.trim())
        .filter(Boolean)
        .join('\n\n')
      if (text) return { text, id }
    }
  }

  return { text: '', id }
}

/** Parse a possibly-SSE, possibly-JSON body into assistant text + id. */
function parseBody(raw: string, contentType: string): Extracted | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const looksSSE =
    contentType.includes('text/event-stream') ||
    /^(data|event):/m.test(trimmed)

  if (!looksSSE) {
    try {
      return extractFromObject(JSON.parse(trimmed))
    } catch {
      return null
    }
  }

  // Reconstruct from SSE: accumulate text deltas and capture any final object.
  let text = ''
  let id: string | undefined
  for (const line of trimmed.split(/\r?\n/)) {
    const m = line.match(/^data:\s?(.*)$/)
    if (!m) continue
    const payload = m[1].trim()
    if (!payload || payload === '[DONE]') continue
    let evt: unknown
    try {
      evt = JSON.parse(payload)
    } catch {
      continue
    }
    const e = evt as Record<string, unknown>
    // /v1/responses streaming deltas.
    if (typeof e.delta === 'string') text += e.delta
    // /v1/chat/completions streaming deltas.
    const choiceDelta = (
      e.choices as Array<{ delta?: { content?: unknown } }> | undefined
    )?.[0]?.delta?.content
    if (typeof choiceDelta === 'string') text += choiceDelta
    // Capture id / final object whenever present.
    const extracted = extractFromObject(e)
    if (extracted.id) id = extracted.id
    if (!text && extracted.text) text = extracted.text
  }

  if (!text && !id) return null
  return { text: text.trim(), id }
}

interface CallOutcome {
  status: number
  extracted: Extracted | null
  /** Redacted error message when the call did not yield usable output. */
  errorMessage?: string
}

export function createOpenClawProvider(settings: OpenClawSettings): ChatProvider {
  return {
    id: 'openclaw',
    async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
      const { token, baseUrl, model, stableUserIdKey } = settings
      if (!token) {
        throw new Error(
          'OpenClaw gateway token is not configured. Add it in Settings → Phantom Chat Settings → OpenClaw Settings.'
        )
      }
      if (!baseUrl) {
        throw new Error('OpenClaw gateway base URL is not configured.')
      }

      const httpBase = toHttpBaseUrl(baseUrl)
      const userKey = resolveUserKey(stableUserIdKey, params.userId)
      const conversationId = params.conversationId?.trim()
      // Per-conversation session key so "New chat" resets gateway-side context.
      const sessionKey = sanitizeKey(
        conversationId ? `${userKey}-${conversationId}` : userKey
      )
      const previousResponseId = params.previousResponseId?.trim() || undefined

      const commonHeaders: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main',
        'x-openclaw-model': model,
        'x-openclaw-session-key': sessionKey,
        'x-openclaw-message-channel': 'webchat',
      }

      const call = async (endpoint: Endpoint): Promise<CallOutcome> => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS)
        try {
          const path =
            endpoint === 'responses' ? '/v1/responses' : '/v1/chat/completions'
          const body =
            endpoint === 'responses'
              ? {
                  model,
                  input: previousResponseId
                    ? latestUserText(params.messages) ||
                      transcriptText(params.messages)
                    : transcriptText(params.messages),
                  user: userKey,
                  ...(previousResponseId
                    ? { previous_response_id: previousResponseId }
                    : {}),
                  stream: false,
                }
              : {
                  model,
                  // Continuity comes from the session-key header; send the new turn.
                  messages: [
                    {
                      role: 'user',
                      content:
                        latestUserText(params.messages) ||
                        transcriptText(params.messages),
                    },
                  ],
                  stream: false,
                }

          const res = await fetch(`${httpBase}${path}`, {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify(body),
            signal: controller.signal,
          })

          const rawBody = await res.text()
          const contentType = res.headers.get('content-type') ?? ''
          const extracted = parseBody(rawBody, contentType)

          if (res.ok && extracted && (extracted.text || extracted.id)) {
            return { status: res.status, extracted }
          }

          // Build a redacted error message for the failure path.
          const fromJson = (() => {
            try {
              const obj = JSON.parse(rawBody) as {
                error?: { message?: string } | string
              }
              return typeof obj.error === 'string'
                ? obj.error
                : obj.error?.message
            } catch {
              return undefined
            }
          })()
          const snippet = rawBody.trim().slice(0, 180)
          return {
            status: res.status,
            extracted: null,
            errorMessage: redact(
              fromJson ||
                (snippet
                  ? `${path} returned an unexpected response (${res.status}): ${snippet}`
                  : `${path} request failed with status ${res.status}`),
              token
            ),
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return {
              status: 0,
              extracted: null,
              errorMessage: 'OpenClaw response timed out.',
            }
          }
          return {
            status: 0,
            extracted: null,
            errorMessage: redact(
              error instanceof Error ? error.message : 'OpenClaw request failed.',
              token
            ),
          }
        } finally {
          clearTimeout(timeout)
        }
      }

      const succeed = (endpoint: Endpoint, extracted: Extracted): SendMessageResult => {
        endpointPreference.set(httpBase, endpoint)
        return {
          assistantText: extracted.text || 'I finished, but no text came back.',
          providerMeta: {
            provider: 'openclaw',
            model,
            userKey,
            // Only /v1/responses gives a replayable handle.
            responseId: endpoint === 'responses' ? extracted.id : undefined,
          },
        }
      }

      const mode = apiMode()
      const order: Endpoint[] =
        mode === 'responses'
          ? ['responses']
          : mode === 'chat'
            ? ['chat']
            : endpointPreference.get(httpBase) === 'chat'
              ? ['chat', 'responses']
              : ['responses', 'chat']

      let last: CallOutcome | undefined
      let all404 = true
      for (const endpoint of order) {
        const outcome = await call(endpoint)
        last = outcome
        if (outcome.extracted && (outcome.extracted.text || outcome.extracted.id)) {
          return succeed(endpoint, outcome.extracted)
        }
        if (outcome.status !== 404) all404 = false
      }

      // Both transports unavailable → the spec's exact message.
      if (all404) throw new OpenClawEndpointDisabledError()
      throw new Error(last?.errorMessage || 'OpenClaw request failed.')
    },
  }
}
