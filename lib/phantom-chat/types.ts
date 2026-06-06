/**
 * Shared types for the Phantom Chat provider system.
 *
 * Phantom Chat can route a text conversation through one of several
 * interchangeable backends ("providers"). Each provider implements the same
 * {@link ChatProvider} interface so the UI and server route stay agnostic.
 */

export const PHANTOM_PROVIDERS = ['openclaw', 'gateway'] as const

export type ProviderId = (typeof PHANTOM_PROVIDERS)[number]

export const DEFAULT_PROVIDER: ProviderId = 'openclaw'

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openclaw: 'OpenClaw (self-hosted)',
  gateway: 'AI Gateway (built-in)',
}

export const DEFAULT_OPENCLAW_BASE_URL =
  'https://darkgrey-quail-161852.hostingersite.com'
export const DEFAULT_OPENCLAW_MODEL = 'openclaw/default'

/** A single turn in the conversation, normalized across providers. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * OpenClaw-specific settings. These are resolved per request from (in order of
 * precedence) the user's saved settings, then environment defaults.
 *
 * NOTE: `token` is intentionally separate from the public settings shape and is
 * never sent to the browser.
 */
export interface OpenClawSettings {
  baseUrl: string
  model: string
  /** Template/override for the stable user id, e.g. `webui:<appUserId>`. */
  stableUserIdKey: string
  /** Secret gateway token. Server-side only — never serialize to the client. */
  token: string
}

/** Public (client-safe) view of Phantom Chat settings. Never contains secrets. */
export interface PublicPhantomChatSettings {
  provider: ProviderId
  openclawBaseUrl: string
  openclawModel: string
  stableUserIdKey: string
  /** Whether a gateway token is configured (via settings or env). Never the value. */
  hasOpenclawToken: boolean
  /** True when the token comes from a saved setting rather than env default. */
  openclawTokenFromSettings: boolean
}

export interface SendMessageParams {
  messages: ChatMessage[]
  /** Stable, app-level user identifier used to build the provider user key. */
  userId: string
  /** Logical conversation id, used to persist provider conversation state. */
  conversationId?: string
  /** Provider conversation handle (e.g. OpenClaw `previous_response_id`). */
  previousResponseId?: string
}

export interface ProviderMeta {
  provider: ProviderId
  model?: string
  /** Provider conversation handle to persist and replay on the next turn. */
  responseId?: string
  /** Resolved stable user key actually sent to the provider. */
  userKey?: string
}

export interface SendMessageResult {
  assistantText: string
  providerMeta: ProviderMeta
}

export interface ChatProvider {
  id: ProviderId
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>
}
