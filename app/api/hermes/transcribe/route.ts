import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_AUDIO_BYTES = 12 * 1024 * 1024

type TranscriptionResponse = {
  text?: string
  error?: { message?: string }
}

function transcriptionConfig() {
  const apiKey =
    process.env.HERMES_TRANSCRIPTION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.HERMES_API_KEY?.trim()

  const baseUrl = (
    process.env.HERMES_TRANSCRIPTION_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.HERMES_BASE_URL?.trim() ||
    'https://api.openai.com/v1'
  ).replace(/\/$/, '')

  const model = process.env.HERMES_TRANSCRIPTION_MODEL?.trim() || 'whisper-1'

  return { apiKey, baseUrl, model }
}

export async function POST(req: Request) {
  const { apiKey, baseUrl, model } = transcriptionConfig()

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Transcription API key is not configured.' },
      { status: 500 }
    )
  }

  let formData: FormData

  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid audio upload.' }, { status: 400 })
  }

  const audio = formData.get('audio')

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 })
  }

  if (audio.size <= 0) {
    return NextResponse.json({ error: 'Audio file is empty.' }, { status: 400 })
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio file is too large.' }, { status: 413 })
  }

  const upstreamForm = new FormData()
  upstreamForm.set('file', audio, audio.name || 'orb-voice.webm')
  upstreamForm.set('model', model)
  upstreamForm.set('response_format', 'json')

  try {
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
    })

    const raw = await response.text()
    let payload: TranscriptionResponse = {}

    if (raw) {
      try {
        payload = JSON.parse(raw) as TranscriptionResponse
      } catch {
        return NextResponse.json(
          { error: `Transcription returned non-JSON response: ${raw.slice(0, 180)}` },
          { status: 502 }
        )
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message || `Transcription failed with status ${response.status}` },
        { status: 502 }
      )
    }

    const text = payload?.text?.trim() || ''

    if (!text) {
      return NextResponse.json({ error: 'No speech was detected.' }, { status: 422 })
    }

    return NextResponse.json({ text })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown transcription error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
