import { NextResponse } from 'next/server'
import { runOpenClawChatTurn } from '@/lib/openclaw-gateway'

export const runtime = 'nodejs'

type LegacyMessage = {
  role?: string
  parts?: Array<{ type?: string; text?: string }>
}

interface BodyData {
  message?: string
  sessionKey?: string
  messages?: LegacyMessage[]
}

function extractMessage(body: BodyData) {
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim()
  }

  if (!Array.isArray(body.messages)) return ''

  const latestUserMessage = [...body.messages]
    .reverse()
    .find((message) => message.role === 'user')

  if (!latestUserMessage?.parts) return ''

  return latestUserMessage.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n')
}

export async function POST(req: Request) {
  let body: BodyData

  try {
    body = (await req.json()) as BodyData
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = extractMessage(body)

  if (!message) {
    return NextResponse.json(
      { error: 'A message is required.' },
      { status: 400 }
    )
  }

  try {
    const result = await runOpenClawChatTurn({
      message,
      sessionKey: body.sessionKey,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
