import {
  convertToModelMessages,
  streamText,
  type ToolSet,
  type UIMessage,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextResponse } from 'next/server'
import { getN8nTools } from '@/lib/n8n-mcp'

/* Hermes Chat proxy.

   Talks to the Hermes bridge — an OpenAI-compatible endpoint — so the
   browser never sees the connection details. Configure via env:

     HERMES_BASE_URL   default: https://hermes-bridge-beta.vercel.app/v1
     HERMES_MODEL      default: hermes-agent
     HERMES_API_KEY    any string (the bridge strips it); default: hermes

   The route streams responses back to the client using the AI SDK UI
   message stream, the same wire format the Helix coder chat uses. */

const BASE_URL = process.env.HERMES_BASE_URL || 'https://hermes-bridge-beta.vercel.app/v1'
const MODEL = process.env.HERMES_MODEL || 'hermes-agent'
const API_KEY = process.env.HERMES_API_KEY || 'hermes'

interface BodyData {
  messages: UIMessage[]
}

export async function POST(req: Request) {
  let body: BodyData
  try {
    body = (await req.json()) as BodyData
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { messages } = body
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 })
  }

  const hermes = createOpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY,
  })

  const { tools: n8nTools, close: closeN8n } = await getN8nTools()

  const result = streamText({
    model: hermes.chat(MODEL),
    messages: await convertToModelMessages(messages),
    ...(Object.keys(n8nTools).length ? { tools: n8nTools as ToolSet } : {}),
    onFinish: closeN8n,
    onError: (error) => {
      console.error('Hermes bridge error')
      console.error(JSON.stringify(error, null, 2))
    },
  })

  result.consumeStream()
  return result.toUIMessageStreamResponse()
}
