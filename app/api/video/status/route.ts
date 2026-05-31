import { NextResponse } from 'next/server'

/* Poll a fal queue job. The client posts the model + requestId; we proxy
   the status (and the final result once completed) so FAL_KEY stays secret.
   POST is used (not GET) so the slash-heavy model id never has to be
   URL-encoded into the path/query, which some platforms reject with a 405. */

const FAL_QUEUE = 'https://queue.fal.run'

export async function POST(req: Request) {
  const key = process.env.FAL_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'FAL_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: { model?: string; requestId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { model, requestId } = body
  if (!model || !requestId) {
    return NextResponse.json(
      { error: 'model and requestId are required' },
      { status: 400 }
    )
  }

  const auth = { Authorization: `Key ${key}` }

  // 1. Check status
  const statusRes = await fetch(
    `${FAL_QUEUE}/${model}/requests/${requestId}/status`,
    { headers: auth, cache: 'no-store' }
  )
  const status = await statusRes.json().catch(() => ({}))
  if (!statusRes.ok) {
    return NextResponse.json(
      { error: status?.detail || `fal status error (${statusRes.status})` },
      { status: statusRes.status }
    )
  }

  // 2. If completed, fetch the result (which carries the video URL)
  if (status.status === 'COMPLETED') {
    const resultRes = await fetch(
      `${FAL_QUEUE}/${model}/requests/${requestId}`,
      { headers: auth, cache: 'no-store' }
    )
    const result = await resultRes.json().catch(() => ({}))
    const videoUrl =
      result?.video?.url ??
      result?.videos?.[0]?.url ??
      result?.output?.video?.url ??
      null
    return NextResponse.json({
      status: 'COMPLETED',
      videoUrl,
      raw: result,
    })
  }

  // IN_QUEUE | IN_PROGRESS
  return NextResponse.json({
    status: status.status,
    queuePosition: status.queue_position ?? null,
  })
}
