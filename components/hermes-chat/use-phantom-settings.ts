'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type {
  ProviderId,
  PublicPhantomChatSettings,
} from '@/lib/phantom-chat/types'

const ENDPOINT = '/api/phantom-chat/settings'

const fetcher = async (url: string): Promise<PublicPhantomChatSettings> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load Phantom Chat settings')
  return res.json()
}

export interface SavePhantomSettings {
  provider?: ProviderId
  openclawBaseUrl?: string
  openclawModel?: string
  stableUserIdKey?: string
  /** undefined = leave untouched, '' = clear, string = set new token. */
  openclawToken?: string
}

/**
 * Client hook for Phantom Chat settings. Settings are persisted server-side
 * (the OpenClaw token never reaches client JS), so this only ever sees the
 * public projection.
 */
export function usePhantomSettings() {
  const { data, error, isLoading, mutate } = useSWR<PublicPhantomChatSettings>(
    ENDPOINT,
    fetcher,
    { revalidateOnFocus: false }
  )

  const save = useCallback(
    async (input: SavePhantomSettings) => {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to save settings')
      }
      const next = (await res.json()) as PublicPhantomChatSettings
      await mutate(next, { revalidate: false })
      return next
    },
    [mutate]
  )

  return { settings: data, error, isLoading, save }
}
