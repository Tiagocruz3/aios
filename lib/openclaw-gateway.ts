import { randomUUID } from 'node:crypto'

const DEFAULT_GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL || 'wss://gateway.capsulerelay.com'
const DEFAULT_MODEL = process.env.OPENCLAW_CHAT_MODEL || 'openai/gpt-5.4'
const CONNECT_TIMEOUT_MS = 15000
const RESPONSE_TIMEOUT_MS = 60000

type GatewayEventPayload = {
  runId?: string
  state?: 'delta' | 'final' | 'error' | 'aborted'
  errorMessage?: string
  message?: {
    text?: string
    content?: Array<{ type?: string; text?: string }>
  }
}

type GatewayEvent = {
  event?: string
  payload?: GatewayEventPayload
}

type GatewayClientInstance = {
  start: () => void
  stopAndWait: (opts?: { timeoutMs?: number }) => Promise<void>
  request: <T = unknown>(
    method: string,
    params?: unknown,
    opts?: { expectFinal?: boolean; timeoutMs?: number | null }
  ) => Promise<T>
}

type GatewayClientConstructor = new (opts: {
  url: string
  token: string
  clientName: 'gateway-client'
  clientVersion: string
  platform: string
  mode: 'backend'
  role: 'operator'
  scopes: string[]
  onEvent?: (event: GatewayEvent) => void
}) => GatewayClientInstance

async function loadGatewayClient() {
  const importer = new Function('modulePath', 'return import(modulePath)') as (
    modulePath: string
  ) => Promise<{ n: GatewayClientConstructor }>

  const module = await importer(
    '/usr/local/lib/node_modules/openclaw/dist/client-CRyAb5LL.js'
  )

  return module.n
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sanitizeSessionKey(sessionKey?: string) {
  const trimmed = sessionKey?.trim()
  if (!trimmed) {
    return `phantom-chat-${randomUUID()}`
  }

  const safe = trimmed.toLowerCase().replace(/[^a-z0-9:_-]/g, '-')
  return safe || `phantom-chat-${randomUUID()}`
}

function extractGatewayText(payload?: GatewayEventPayload) {
  if (!payload?.message) return ''

  if (typeof payload.message.text === 'string' && payload.message.text.trim()) {
    return payload.message.text.trim()
  }

  if (!Array.isArray(payload.message.content)) return ''

  return payload.message.content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n')
}

async function requestWhenConnected<T>(
  client: GatewayClientInstance,
  method: string,
  params?: unknown,
  timeoutMs = CONNECT_TIMEOUT_MS
) {
  const startedAt = Date.now()

  while (true) {
    try {
      return await client.request<T>(method, params)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const stillConnecting = message.includes('gateway not connected')

      if (!stillConnecting || Date.now() - startedAt >= timeoutMs) {
        throw error
      }

      await sleep(150)
    }
  }
}

async function ensureSession(
  client: GatewayClientInstance,
  sessionKey: string,
  label: string
) {
  try {
    await requestWhenConnected(client, 'sessions.create', {
      key: sessionKey,
      label,
      agentId: 'main',
      model: DEFAULT_MODEL,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const duplicate =
      message.includes('already exists') ||
      message.includes('duplicate') ||
      message.includes('exists')

    if (!duplicate) {
      throw error
    }
  }
}

export async function runOpenClawChatTurn({
  message,
  sessionKey,
  label = 'Phantom Chat',
}: {
  message: string
  sessionKey?: string
  label?: string
}) {
  const token = process.env.OPENCLAW_GATEWAY_TOKEN?.trim()

  if (!token) {
    throw new Error('OPENCLAW_GATEWAY_TOKEN is not configured')
  }

  const GatewayClient = await loadGatewayClient()
  const resolvedSessionKey = sanitizeSessionKey(sessionKey)
  const runId = randomUUID()

  let resolveFinal: ((payload: GatewayEventPayload) => void) | null = null
  let rejectFinal: ((reason?: unknown) => void) | null = null

  const finalEvent = new Promise<GatewayEventPayload>((resolve, reject) => {
    resolveFinal = resolve
    rejectFinal = reject
  })

  const client = new GatewayClient({
    url: DEFAULT_GATEWAY_URL,
    token,
    clientName: 'gateway-client',
    clientVersion: 'aios-hermes-route',
    platform: 'node',
    mode: 'backend',
    role: 'operator',
    scopes: ['operator.read', 'operator.write'],
    onEvent: (event) => {
      if (event.event !== 'chat') return
      if (event.payload?.runId !== runId) return

      if (
        event.payload.state === 'final' ||
        event.payload.state === 'error' ||
        event.payload.state === 'aborted'
      ) {
        resolveFinal?.(event.payload)
      }
    },
  })

  client.start()

  try {
    await ensureSession(client, resolvedSessionKey, label)

    await requestWhenConnected(client, 'chat.send', {
      sessionKey: resolvedSessionKey,
      message,
      thinking: 'minimal',
      idempotencyKey: runId,
    })

    const timeout = setTimeout(() => {
      rejectFinal?.(new Error('OpenClaw response timed out'))
    }, RESPONSE_TIMEOUT_MS)

    try {
      const final = await finalEvent

      if (final.state === 'error') {
        throw new Error(final.errorMessage || 'OpenClaw request failed')
      }

      if (final.state === 'aborted') {
        throw new Error('OpenClaw request was aborted')
      }

      const text = extractGatewayText(final)

      return {
        sessionKey: resolvedSessionKey,
        text: text || 'I finished, but no text came back.',
      }
    } finally {
      clearTimeout(timeout)
    }
  } finally {
    await client.stopAndWait({ timeoutMs: 2000 }).catch(() => undefined)
  }
}
