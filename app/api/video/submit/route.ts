import { NextResponse } from 'next/server'

/* Submit a text-to-video generation job to fal's async queue.
   The FAL_KEY is read server-side only and never exposed to the client. */

const FAL_QUEUE = 'https://queue.fal.run'

// Supported short-form vertical video models on fal.
const MODELS: Record<string, string> = {
  'ltx-video': 'fal-ai/ltx-video',
  'kling-1.6': 'fal-ai/kling-video/v1.6/standard/text-to-video',
  'kling-2.1': 'fal-ai/kling-video/v2.1/master/text-to-video',
  'wan-t2v': 'fal-ai/wan-t2v',
  'minimax': 'fal-ai/minimax/hailuo-02/standard/text-to-video',
}

export async function POST(req: Request) {
  const key = process.env.FAL_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'FAL_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  let body: {
    prompt?: string
    model?: string
    duration?: number
    aspectRatio?: string
    negativePrompt?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const prompt = body.prompt?.trim()
  if (!prompt) {
    return NextResponse.json({ error: 'A prompt is required' }, { status: 400 })
  }

  const modelId = MODELS[body.model ?? 'kling-1.6'] ?? MODELS['kling-1.6']

  // Build a model-agnostic input. fal models accept extra fields gracefully,
  // but we keep to the common, widely-supported parameters.
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: body.aspectRatio ?? '9:16', // vertical Shorts
  }
  if (body.duration) input.duration = String(body.duration)
  if (body.negativePrompt) input.negative_prompt = body.negativePrompt

  const res = await fetch(`${FAL_QUEUE}/${modelId}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.detail || data?.error || `fal error (${res.status})` },
      { status: res.status }
    )
  }

  // Returns request_id + status_url + response_url
  return NextResponse.json({
    requestId: data.request_id,
    model: modelId,
    statusUrl: data.status_url,
    responseUrl: data.response_url,
  })
}
