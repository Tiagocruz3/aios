import { NextResponse } from 'next/server'
import {
  loadPublicSettings,
  saveSettings,
  type SaveSettingsInput,
} from '@/lib/phantom-chat/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Return client-safe settings. Never includes the gateway token value. */
export async function GET() {
  try {
    const settings = await loadPublicSettings()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json(
      { error: 'Failed to load Phantom Chat settings.' },
      { status: 500 }
    )
  }
}

interface SaveBody extends SaveSettingsInput {}

/** Persist settings. The token is written to an encrypted httpOnly cookie. */
export async function POST(req: Request) {
  let body: SaveBody
  try {
    body = (await req.json()) as SaveBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    await saveSettings({
      provider: body.provider,
      openclawBaseUrl: body.openclawBaseUrl,
      openclawModel: body.openclawModel,
      stableUserIdKey: body.stableUserIdKey,
      openclawToken: body.openclawToken,
    })
    // Echo back the new public state (still no token value).
    const settings = await loadPublicSettings()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json(
      { error: 'Failed to save Phantom Chat settings.' },
      { status: 500 }
    )
  }
}
