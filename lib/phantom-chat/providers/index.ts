/**
 * Provider registry and dispatcher for Phantom Chat.
 *
 * `sendMessage(provider, params)` is the single entry point used by the server
 * route. Adding a new backend means implementing {@link ChatProvider} and
 * wiring it up here — the UI and route do not change.
 */

import type {
  ChatProvider,
  ProviderId,
  SendMessageParams,
  SendMessageResult,
} from '../types'
import type { OpenClawSettings } from '../types'
import { createOpenClawProvider } from './openclaw'
import { createGatewayProvider } from './gateway'

export { OpenClawEndpointDisabledError } from './openclaw'

export interface ResolveProviderContext {
  openclaw: OpenClawSettings
}

/** Build the concrete provider implementation for the selected id. */
export function resolveProvider(
  provider: ProviderId,
  ctx: ResolveProviderContext
): ChatProvider {
  switch (provider) {
    case 'openclaw':
      return createOpenClawProvider(ctx.openclaw)
    case 'gateway':
      return createGatewayProvider()
    default: {
      // Exhaustiveness guard.
      const _never: never = provider
      throw new Error(`Unknown chat provider: ${String(_never)}`)
    }
  }
}

/** Common interface: dispatch a turn to the selected provider. */
export async function sendMessage(
  provider: ProviderId,
  ctx: ResolveProviderContext,
  params: SendMessageParams
): Promise<SendMessageResult> {
  return resolveProvider(provider, ctx).sendMessage(params)
}
