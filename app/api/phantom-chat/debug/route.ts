import { NextResponse } from 'next/server'
import { loadServerSettings } from '@/lib/phantom-chat/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * TEMPORARY diagnostic: dumps the raw gateway response for both transports so we
 * can see the exact body shape. The token is redacted and never returned.
 *
 * Open: /api/phantom-chat/debug?msg=Hi
 * Remove this route once the parser is confirmed working.
 */
function toHttpBaseUrl(raw: string): string {
  const t = raw.trim().replace(/\/$/, '')
  if (t.startsWith('wss://')) return `https://${t.slice(6)}`
  if (t.startsWith('ws://')) return `http://${t.slice(5)}`
  return t
}

function redact(s: string, token: string): string {
  return token ? s.split(token).join('***REDACTED***') : s
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const msg = url.searchParams.get('msg') || 'Hi'
  const { openclaw } = await loadServerSettings()
  const { token, baseUrl, model } = openclaw

  if (!token) {
    return NextResponse.json({ error: 'No gateway token configured.' }, { status: 400 })
  }

  const base = toHttpBaseUrl(baseUrl)
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-openclaw-agent-id': 'main',
    'x-openclaw-model': model,
    'x-openclaw-session-key': 'debug-probe',
    'x-openclaw-message-channel': 'webchat',
  }

  async function probe(path: string, body: unknown) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45_000)
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const raw = await res.text()
      return {
        path,
        status: res.status,
        contentType: res.headers.get('content-type'),
        bodyLength: raw.length,
        // First 4 KB is plenty to identify the shape.
        body: redact(raw.slice(0, 4000), token),
      }
    } catch (e) {
      return {
        path,
        error: redact(e instanceof Error ? e.message : 'request failed', token),
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  const [responses, chat] = await Promise.all([
    probe('/v1/responses', {
      model,
      input: msg,
      user: 'debug-probe',
      stream: false,
    }),
    probe('/v1/chat/completions', {
      model,
      messages: [{ role: 'user', content: msg }],
      stream: false,
    }),
  ])

  return NextResponse.json(
    { baseUrl: base, model, responses, chat },
    { headers: { 'cache-control': 'no-store' } }
  )
}
