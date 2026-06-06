/**
 * Server-side persistence for Phantom Chat settings.
 *
 * This project has no database, so settings are stored in cookies:
 *   - Non-secret settings live in a normal JSON cookie (`pc_settings`).
 *   - The OpenClaw token lives in a SEPARATE, httpOnly, JWE-encrypted cookie
 *     (`pc_openclaw_token`) so it is encrypted at rest and unreadable by client
 *     JS. The browser sends it automatically with same-origin API requests; it
 *     never touches the client bundle.
 *
 * The storage layer is deliberately isolated behind {@link loadServerSettings}
 * / {@link saveSettings}. Swapping the cookie store for a per-user DB table
 * (`phantom_chat_settings`) is a drop-in replacement for these two functions.
 *
 * IMPORTANT: import only from server code (route handlers / server actions).
 */

import 'server-only'
import { cookies } from 'next/headers'
import { EncryptJWT, jwtDecrypt } from 'jose'
import { createHash } from 'node:crypto'
import {
  DEFAULT_OPENCLAW_BASE_URL,
  DEFAULT_OPENCLAW_MODEL,
  DEFAULT_PROVIDER,
  PHANTOM_PROVIDERS,
  type OpenClawSettings,
  type ProviderId,
  type PublicPhantomChatSettings,
} from './types'

const SETTINGS_COOKIE = 'pc_settings'
const TOKEN_COOKIE = 'pc_openclaw_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

interface StoredSettings {
  provider?: ProviderId
  openclawBaseUrl?: string
  openclawModel?: string
  stableUserIdKey?: string
}

/**
 * 32-byte key for A256GCM JWE, derived from a server-only secret. We chain
 * through likely-configured secrets so encryption is meaningful out of the box,
 * but operators SHOULD set `PHANTOM_SETTINGS_SECRET` explicitly.
 */
function encryptionKey(): Uint8Array {
  const secret =
    process.env.PHANTOM_SETTINGS_SECRET ||
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    process.env.AI_GATEWAY_API_KEY ||
    'phantom-chat-insecure-dev-key-set-PHANTOM_SETTINGS_SECRET'
  return new Uint8Array(createHash('sha256').update(secret).digest())
}

async function encryptToken(token: string): Promise<string> {
  return new EncryptJWT({ t: token })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .encrypt(encryptionKey())
}

async function decryptToken(jwe: string): Promise<string | null> {
  try {
    const { payload } = await jwtDecrypt(jwe, encryptionKey())
    const t = (payload as { t?: unknown }).t
    return typeof t === 'string' && t.trim() ? t : null
  } catch {
    // Tampered, wrong key, or expired — treat as no stored token.
    return null
  }
}

function readStoredSettings(raw: string | undefined): StoredSettings {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as StoredSettings
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeProvider(value: unknown): ProviderId | undefined {
  return PHANTOM_PROVIDERS.includes(value as ProviderId)
    ? (value as ProviderId)
    : undefined
}

interface ResolvedSettings {
  provider: ProviderId
  openclaw: OpenClawSettings
  /** Whether any token is available (settings or env). */
  hasToken: boolean
  /** Whether the token came from saved settings (vs env default). */
  tokenFromSettings: boolean
}

/**
 * Resolve effective settings for the current request: saved user settings take
 * precedence over environment defaults.
 */
export async function loadServerSettings(): Promise<ResolvedSettings> {
  const store = await cookies()
  const stored = readStoredSettings(store.get(SETTINGS_COOKIE)?.value)

  const tokenCookie = store.get(TOKEN_COOKIE)?.value
  const savedToken = tokenCookie ? await decryptToken(tokenCookie) : null
  const envToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim() || ''
  const token = savedToken || envToken

  const envBaseUrl =
    process.env.OPENCLAW_GATEWAY_BASE_URL?.trim() ||
    process.env.OPENCLAW_GATEWAY_HTTP_URL?.trim() ||
    process.env.OPENCLAW_GATEWAY_URL?.trim() ||
    DEFAULT_OPENCLAW_BASE_URL

  return {
    provider: normalizeProvider(stored.provider) ?? DEFAULT_PROVIDER,
    openclaw: {
      baseUrl: stored.openclawBaseUrl?.trim() || envBaseUrl,
      model:
        stored.openclawModel?.trim() ||
        process.env.OPENCLAW_MODEL?.trim() ||
        process.env.OPENCLAW_CHAT_MODEL?.trim() ||
        DEFAULT_OPENCLAW_MODEL,
      stableUserIdKey: stored.stableUserIdKey?.trim() || 'webui:<appUserId>',
      token,
    },
    hasToken: Boolean(token),
    tokenFromSettings: Boolean(savedToken),
  }
}

/** Client-safe projection of the resolved settings. Never includes the token. */
export async function loadPublicSettings(): Promise<PublicPhantomChatSettings> {
  const s = await loadServerSettings()
  return {
    provider: s.provider,
    openclawBaseUrl: s.openclaw.baseUrl,
    openclawModel: s.openclaw.model,
    stableUserIdKey: s.openclaw.stableUserIdKey,
    hasOpenclawToken: s.hasToken,
    openclawTokenFromSettings: s.tokenFromSettings,
  }
}

export interface SaveSettingsInput {
  provider?: string
  openclawBaseUrl?: string
  openclawModel?: string
  stableUserIdKey?: string
  /**
   * New token value. `undefined` leaves the stored token untouched; an empty
   * string clears it (falling back to the env default).
   */
  openclawToken?: string
}

/** Persist settings. Secret token is written to its own encrypted cookie. */
export async function saveSettings(input: SaveSettingsInput): Promise<void> {
  const store = await cookies()
  const current = readStoredSettings(store.get(SETTINGS_COOKIE)?.value)

  const next: StoredSettings = {
    provider: normalizeProvider(input.provider) ?? current.provider,
    openclawBaseUrl:
      input.openclawBaseUrl?.trim() ?? current.openclawBaseUrl,
    openclawModel: input.openclawModel?.trim() ?? current.openclawModel,
    stableUserIdKey:
      input.stableUserIdKey?.trim() ?? current.stableUserIdKey,
  }

  const secureCookie = {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
  }

  store.set(SETTINGS_COOKIE, JSON.stringify(next), {
    ...secureCookie,
    httpOnly: false, // non-secret; readable for hydration convenience
  })

  if (input.openclawToken !== undefined) {
    const trimmed = input.openclawToken.trim()
    if (trimmed) {
      store.set(TOKEN_COOKIE, await encryptToken(trimmed), {
        ...secureCookie,
        httpOnly: true, // secret: never exposed to client JS
      })
    } else {
      store.delete(TOKEN_COOKIE)
    }
  }
}
