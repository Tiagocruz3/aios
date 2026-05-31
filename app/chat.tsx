'use client'

import type { ChatUIMessage } from '@/components/chat/types'
import { TEST_PROMPTS } from '@/ai/constants'
import { ArrowUpIcon, SparklesIcon, SquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message } from '@/components/chat/message'
import { ModelSelector } from '@/components/settings/model-selector'
import { Panel } from '@/components/panels/panels'
import { Settings } from '@/components/settings/settings'
import { useChat } from '@ai-sdk/react'
import { useLocalStorageValue } from '@/lib/use-local-storage-value'
import { useCallback, useEffect, useRef } from 'react'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSettings } from '@/components/settings/use-settings'
import { useSandboxStore } from './state'
import { cn } from '@/lib/utils'

interface Props {
  className: string
}

export function Chat({ className }: Props) {
  const [input, setInput] = useLocalStorageValue('prompt-input')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus } = useSandboxStore()
  const isLoading = status === 'streaming' || status === 'submitted'

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [])

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return
      sendMessage({ text }, { body: { modelId, reasoningEffort } })
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    },
    [sendMessage, modelId, setInput, reasoningEffort, isLoading]
  )

  useEffect(() => {
    setChatStatus(status)
  }, [status, setChatStatus])

  return (
    <Panel className={cn('flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="holo-panel-header flex items-center px-3 py-2 flex-shrink-0">
        <SparklesIcon className="w-3.5 h-3.5 mr-2 text-cyan-400 flex-shrink-0" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-200">
          Chat
        </span>
        {isLoading && (
          <div className="ml-2.5 flex items-center gap-0.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}
        <span className="ml-auto font-mono text-xs text-slate-600 select-none">
          {status}
        </span>
      </div>

      {/* Messages / Empty state */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full px-4 gap-4">
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold text-slate-200">
                Start building something
              </p>
              <p className="text-xs text-slate-500">
                Try one of these prompts to get started:
              </p>
            </div>
            <ul className="w-full space-y-1.5">
              {TEST_PROMPTS.map((prompt, idx) => (
                <li
                  key={idx}
                  className="px-3 py-2 rounded-lg border border-cyan-500/12 bg-cyan-500/5 text-xs text-slate-400 cursor-pointer hover:bg-cyan-500/10 hover:text-slate-200 hover:border-cyan-500/28 transition-all duration-150 leading-snug"
                  onClick={() => validateAndSubmitMessage(prompt)}
                >
                  {prompt}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Conversation className="relative h-full">
            <ConversationContent className="px-3 py-4 space-y-5">
              {messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      {/* Claude-style input area */}
      <div className="flex-shrink-0 p-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            validateAndSubmitMessage(input)
          }}
          className="claude-input-wrap"
        >
          {/* Top toolbar: model + settings */}
          <div className="flex items-center gap-1 px-2 pt-2 pb-0">
            <ModelSelector />
            <Settings />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="claude-textarea"
            disabled={isLoading}
            onChange={(e) => {
              setInput(e.target.value)
              adjustHeight()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                validateAndSubmitMessage(input)
              }
            }}
            placeholder="Message… (⏎ send · ⇧⏎ newline)"
            rows={1}
            value={input}
          />

          {/* Bottom row: send button */}
          <div className="flex items-center justify-end px-2.5 pb-2.5">
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 flex-shrink-0',
                !isLoading && input.trim()
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_14px_rgba(0,210,255,0.45)] cursor-pointer'
                  : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <SquareIcon className="w-3.5 h-3.5" />
              ) : (
                <ArrowUpIcon className="w-4 h-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </form>
      </div>
    </Panel>
  )
}
