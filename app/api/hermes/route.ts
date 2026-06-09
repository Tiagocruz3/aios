import { NextResponse } from 'next/server'
import { loadServerSettings } from '@/lib/phantom-chat/settings'
import {
  OpenClawEndpointDisabledError,
  sendMessage,
} from '@/lib/phantom-chat/providers'
import { cookieConversationStore } from '@/lib/phantom-chat/conversation-store'
import {
  PHANTOM_PROVIDERS,
  type ChatMessage,
  type ProviderId,
} from '@/lib/phantom-chat/types'

export const runtime = 'nodejs'
export const maxDuration = 60

type IncomingMessage = {
  role?: string
  content?: string
  parts?: Array<{ type?: string; text?: string }>
}

interface BodyData {
  /** Latest user message (legacy single-message shape). */
  message?: string
  /** Full transcript (used by stateless providers like the gateway). */
  messages?: IncomingMessage[]
  /** Stable per-conversation id for server-side state. */
  conversationId?: string
  /** Stable app-level user id used to build the provider user key. */
  userId?: string
  /** Optional per-request provider override. */
  provider?: string
  /** Legacy field kept for backward compatibility. */
  sessionKey?: string
}

function partsToText(parts?: Array<{ type?: string; text?: string }>): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n')
}

function normalizeMessages(body: BodyData): ChatMessage[] {
  const out: ChatMessage[] = []
  if (Array.isArray(body.messages)) {
    for (const m of body.messages) {
      const role =
        m.role === 'assistant' || m.role === 'system' ? m.role : 'user'
      const content =
        (typeof m.content === 'string' ? m.content : '') || partsToText(m.parts)
      if (content.trim()) out.push({ role, content: content.trim() })
    }
  }
  if (out.length === 0 && typeof body.message === 'string' && body.message.trim()) {
    out.push({ role: 'user', content: body.message.trim() })
  }
  return out
}

export async function POST(req: Request) {
  let body: BodyData
  try {
    body = (await req.json()) as BodyData
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const messages = normalizeMessages(body)
  if (messages.length === 0) {
    return NextResponse.json({ error: 'A message is required.' }, { status: 400 })
  }

  const conversationId = body.conversationId?.trim() || undefined
  const userId = body.userId?.trim() || body.sessionKey?.trim() || 'webui-user'

  try {
    const settings = await loadServerSettings()
    const requestedProvider = PHANTOM_PROVIDERS.includes(
      body.provider as ProviderId
    )
      ? (body.provider as ProviderId)
      : settings.provider

    // Replay prior provider conversation state (previous_response_id).
    const previousResponseId = conversationId
      ? await cookieConversationStore.get(conversationId)
      : undefined

    const { assistantText, providerMeta } = await sendMessage(
      requestedProvider,
      { openclaw: settings.openclaw },
      { messages, userId, conversationId, previousResponseId }
    )

    // Persist the new response handle so the next turn keeps context.
    if (conversationId && providerMeta.responseId) {
      await cookieConversationStore.set(conversationId, providerMeta.responseId)
    }

    return NextResponse.json({
      text: assistantText,
      provider: providerMeta.provider,
      responseId: providerMeta.responseId,
      // Back-compat: the old client read `sessionKey` from the response.
      sessionKey: providerMeta.userKey ?? body.sessionKey,
      conversationId,
    })
  } catch (error) {
    if (error instanceof OpenClawEndpointDisabledError) {
      // Exact, user-facing message required by the spec.
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
