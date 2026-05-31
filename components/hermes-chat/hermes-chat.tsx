'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Streamdown } from 'streamdown'
import {
  ArrowUpIcon,
  SquareIcon,
  SparklesIcon,
  PlusIcon,
  AtomIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Explain quantum entanglement in simple terms',
  'Write a haiku about late-night coding',
  'Draft a product launch announcement',
  'Help me plan a 3-day trip to Tokyo',
]

export function HermesChat({ className }: { className?: string }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/hermes' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'
  const isEmpty = messages.length === 0

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = useCallback(
    (text: string) => {
      const value = text.trim()
      if (!value || isLoading) return
      sendMessage({ text: value })
      setInput('')
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      })
    },
    [isLoading, sendMessage]
  )

  return (
    <div className={cn('flex flex-col h-full w-full min-h-0 bg-[#0a0f16]', className)}>
      {/* top bar */}
      <div className="flex items-center gap-2 px-5 h-11 flex-shrink-0 border-b border-white/8">
        <AtomIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
          Hermes
        </span>
        <span className="text-[10px] font-mono text-slate-600">hermes-agent</span>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="ml-auto flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-mono text-slate-400 border border-white/10 bg-white/[0.03] hover:text-cyan-200 hover:border-cyan-400/30 transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New chat
          </button>
        )}
      </div>

      {/* conversation */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06]">
              <SparklesIcon className="w-6 h-6 text-cyan-300" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-mono font-semibold text-slate-100">
                How can I help you today?
              </h1>
              <p className="text-xs font-mono text-slate-500 mt-2">
                Connected to the Hermes bridge
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="text-left text-xs font-mono px-3.5 py-3 rounded-xl border border-white/8 bg-white/[0.02] text-slate-400 hover:text-cyan-100 hover:border-cyan-400/30 hover:bg-cyan-400/[0.04] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl w-full px-4 py-6 space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {status === 'submitted' && (
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300/70 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Hermes is thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* composer */}
      <div className="flex-shrink-0 border-t border-white/8 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-cyan-500/15 bg-black/40 px-3 py-2.5 focus-within:border-cyan-400/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                adjustHeight()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit(input)
                }
              }}
              rows={1}
              placeholder="Message Hermes…"
              className="flex-1 resize-none bg-transparent font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none leading-relaxed py-1 max-h-[200px]"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                title="Stop"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-all flex-shrink-0"
              >
                <SquareIcon className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submit(input)}
                disabled={!input.trim()}
                title="Send"
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0',
                  input.trim()
                    ? 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_18px_-4px_rgba(0,200,255,0.6)]'
                    : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                )}
              >
                <ArrowUpIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-center text-[10px] font-mono text-slate-700 mt-2">
            Hermes can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── single message ─────────────────────────────────────────────── */
function MessageBubble({
  message,
}: {
  message: { id: string; role: string; parts: Array<{ type: string; text?: string }> }
}) {
  const text = message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('')

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] text-sm font-mono px-4 py-2.5 rounded-2xl rounded-br-md bg-cyan-400/10 border border-cyan-400/20 text-slate-100 whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] flex-shrink-0 mt-0.5">
        <AtomIcon className="w-3.5 h-3.5 text-cyan-300" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0 text-sm text-slate-200 leading-relaxed pt-0.5 hermes-prose">
        <Streamdown>{text}</Streamdown>
      </div>
    </div>
  )
}
