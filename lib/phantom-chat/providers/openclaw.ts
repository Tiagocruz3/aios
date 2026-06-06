/**
 * OpenClaw (self-hosted) provider.
 *
 * Talks to an OpenAI-compatible gateway via `POST /v1/responses`. Conversation
 * state is maintained the OpenAI way: we send a stable `user` key on every
 * request and replay the previous turn's `response.id` as `previous_response_id`.
 *
 * This module runs server-side only — the browser must never call the gateway
 * directly, and the token is never logged.
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

/** Marker error so the route can surface the exact required message/status. */
export class OpenClawEndpointDisabledError extends Error {
  constructor() {
    super('OpenClaw Gateway endpoints not enabled or gateway needs restart.')
    this.name = 'OpenClawEndpointDisabledError'
  }
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
  // Keep the key gateway-friendly.
  return expanded.toLowerCase().replace(/[^a-z0-9:_-]/g, '-') || `webui-${safeUserId}`
}

/**
 * Build the `input` for /v1/responses. When we have prior server-side state
 * (`previous_response_id`), only the newest user turn needs to be sent;
 * otherwise we send the full transcript as text (baseline conversion).
 */
function buildInput(messages: ChatMessage[], hasPrevious: boolean): string {
  if (hasPrevious) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser?.content.trim()) return lastUser.content.trim()
  }
  return messages
    .filter((m) => m.content.trim())
    .map((m) => {
      const label =
        m.role === 'assistant' ? 'Assistant' : m.role === 'system' ? 'System' : 'User'
      return `${label}: ${m.content.trim()}`
    })
    .join('\n\n')
}

/** Extract assistant text from a /v1/responses payload, robust to shape. */
function extractText(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>

  // Convenience field provided by many implementations.
  if (typeof d.output_text === 'string' && d.output_text.trim()) {
    return d.output_text.trim()
  }

  // Walk the structured output array.
  const output = Array.isArray(d.output) ? d.output : []
  const chunks: string[] = []
  for (const item of output) {
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
  return chunks.filter(Boolean).join('\n\n')
}

/** Strip the token from any string so it can never leak into logs/errors. */
function redact(input: string, token: string): string {
  if (!token) return input
  return input.split(token).join('***REDACTED***')
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

      const userKey = resolveUserKey(stableUserIdKey, params.userId)
      const previousResponseId = params.previousResponseId?.trim() || undefined
      const input = buildInput(params.messages, Boolean(previousResponseId))

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS)

      try {
        const response = await fetch(`${toHttpBaseUrl(baseUrl)}/v1/responses`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input,
            user: userKey,
            ...(previousResponseId
              ? { previous_response_id: previousResponseId }
              : {}),
            stream: false,
          }),
          signal: controller.signal,
        })

        // The defining symptom of a gateway without /v1/responses enabled.
        if (response.status === 404) {
          throw new OpenClawEndpointDisabledError()
        }

        const rawBody = await response.text()
        let data: unknown = null
        if (rawBody) {
          try {
            data = JSON.parse(rawBody)
          } catch {
            throw new Error(
              `OpenClaw returned a non-JSON response: ${redact(
                rawBody.slice(0, 180),
                token
              )}`
            )
          }
        }

        if (!response.ok) {
          const message =
            (data as { error?: { message?: string } } | null)?.error?.message ||
            `OpenClaw request failed with status ${response.status}`
          throw new Error(redact(message, token))
        }

        const responseId = (data as { id?: unknown } | null)?.id
        const assistantText = extractText(data)

        return {
          assistantText: assistantText || 'I finished, but no text came back.',
          providerMeta: {
            provider: 'openclaw',
            model,
            userKey,
            responseId: typeof responseId === 'string' ? responseId : undefined,
          },
        }
      } catch (error) {
        if (error instanceof OpenClawEndpointDisabledError) throw error
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('OpenClaw response timed out.')
        }
        // Final safety net: never let the token escape in an error message.
        if (error instanceof Error) {
          throw new Error(redact(error.message, token))
        }
        throw error
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
