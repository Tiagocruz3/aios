/**
 * Per-conversation provider state (e.g. OpenClaw `previous_response_id`).
 *
 * Persisting this server-side lets context survive page reloads and other tabs
 * in the same browser without trusting the client to round-trip the handle.
 *
 * Backed by an httpOnly cookie holding a `{ [conversationId]: responseId }`
 * map. The {@link ConversationStore} interface isolates this so a per-user DB
 * table is a drop-in replacement (which would also enable cross-device state).
 */

import 'server-only'
import { cookies } from 'next/headers'

const STATE_COOKIE = 'pc_convo_state'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const MAX_ENTRIES = 30 // keep the cookie small; evict oldest

export interface ConversationStore {
  get(conversationId: string): Promise<string | undefined>
  set(conversationId: string, responseId: string): Promise<void>
  clear(conversationId: string): Promise<void>
}

type StateMap = Record<string, string>

function read(raw: string | undefined): StateMap {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as StateMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function write(map: StateMap): Promise<void> {
  const store = await cookies()
  // Evict oldest entries (insertion order) if the map grows too large.
  const entries = Object.entries(map)
  const trimmed = entries.slice(Math.max(0, entries.length - MAX_ENTRIES))
  store.set(STATE_COOKIE, JSON.stringify(Object.fromEntries(trimmed)), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
  })
}

export const cookieConversationStore: ConversationStore = {
  async get(conversationId) {
    if (!conversationId) return undefined
    const store = await cookies()
    return read(store.get(STATE_COOKIE)?.value)[conversationId]
  },
  async set(conversationId, responseId) {
    if (!conversationId || !responseId) return
    const store = await cookies()
    const map = read(store.get(STATE_COOKIE)?.value)
    // Re-insert at the end so it counts as most-recently-used.
    delete map[conversationId]
    map[conversationId] = responseId
    await write(map)
  },
  async clear(conversationId) {
    if (!conversationId) return
    const store = await cookies()
    const map = read(store.get(STATE_COOKIE)?.value)
    if (conversationId in map) {
      delete map[conversationId]
      await write(map)
    }
  },
}
