/**
 * Built-in AI Gateway provider for Phantom Chat.
 *
 * Routes the conversation through the project's existing Vercel AI Gateway
 * configuration. This gives Phantom Chat a real second backend so users can
 * switch providers and observe the behavior change immediately.
 */

import { generateText } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { DEFAULT_MODEL } from '@/ai/constants'
import type {
  ChatProvider,
  SendMessageParams,
  SendMessageResult,
} from '../types'

const SYSTEM_PROMPT =
  'You are Phantom, a concise, helpful text-chat assistant. Answer clearly in Markdown.'

export function createGatewayProvider(modelId: string = DEFAULT_MODEL): ChatProvider {
  return {
    id: 'gateway',
    async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
      const result = await generateText({
        ...getModelOptions(modelId),
        system: SYSTEM_PROMPT,
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })

      return {
        assistantText: result.text || 'I finished, but no text came back.',
        providerMeta: { provider: 'gateway', model: modelId },
      }
    },
  }
}
