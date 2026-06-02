import { randomUUID } from 'node:crypto'

const DEFAULT_GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_HTTP_URL ||
  process.env.OPENCLAW_GATEWAY_URL ||
  'https://chat.capsulerelay.com'
const DEFAULT_MODEL = process.env.OPENCLAW_CHAT_MODEL || 'openai/gpt-5.5'
const RESPONSE_TIMEOUT_MS = 60000

type ChatCompletionChoice = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>
  }
}

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[]
  error?: {
    message?: string
    code?: string
  }
}

function sanitizeSessionKey(sessionKey?: string) {
  const trimmed = sessionKey?.trim()
  if (!trimmed) {
    return `phantom-chat-${randomUUID()}`
  }

  const safe = trimmed.toLowerCase().replace(/[^a-z0-9:_-]/g, '-')
  return safe || `phantom-chat-${randomUUID()}`
}

function gatewayHttpBaseUrl() {
  const raw = DEFAULT_GATEWAY_URL.trim().replace(/\/$/, '')

  if (raw.startsWith('wss://')) return `https://${raw.slice('wss://'.length)}`
  if (raw.startsWith('ws://')) return `http://${raw.slice('ws://'.length)}`

  return raw
}

function extractChoiceText(choice?: ChatCompletionChoice) {
  const content = choice?.message?.content

  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''

  return content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n')
}

export async function runOpenClawChatTurn({
  message,
  sessionKey,
}: {
  message: string
  sessionKey?: string
  label?: string
}) {
  const token = process.env.OPENCLAW_GATEWAY_TOKEN?.trim()

  if (!token) {
    throw new Error('OPENCLAW_GATEWAY_TOKEN is not configured')
  }

  const resolvedSessionKey = sanitizeSessionKey(sessionKey)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS)

  try {
    const response = await fetch(`${gatewayHttpBaseUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main',
        'x-openclaw-model': DEFAULT_MODEL,
        'x-openclaw-session-key': resolvedSessionKey,
        'x-openclaw-message-channel': 'webchat',
      },
      body: JSON.stringify({
        model: 'openclaw/default',
        messages: [{ role: 'user', content: message }],
        stream: false,
      }),
      signal: controller.signal,
    })

    const raw = await response.text()
    let data: ChatCompletionResponse | null = null

    if (raw) {
      try {
        data = JSON.parse(raw) as ChatCompletionResponse
      } catch {
        throw new Error(`OpenClaw returned non-JSON response: ${raw.slice(0, 180)}`)
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          `OpenClaw HTTP request failed with status ${response.status}`
      )
    }

    const text = extractChoiceText(data?.choices?.[0])

    return {
      sessionKey: resolvedSessionKey,
      text: text || 'I finished, but no text came back.',
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenClaw response timed out')
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}
