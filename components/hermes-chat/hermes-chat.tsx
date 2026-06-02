'use client'

import {
  ArrowUpIcon,
  SquareIcon,
  SparklesIcon,
  PlusIcon,
  RadioIcon,
} from 'lucide-react'
import { Streamdown } from 'streamdown'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Give me a clean summary of what is happening across my OpenClaw setup.',
  'Help me plan the next steps for wiring this dashboard into OpenClaw.',
  'Draft a short status update I can send about this project.',
  'What should I fix first to make the tunnel and frontend more reliable?',
]

const SESSION_STORAGE_KEY = 'phantom-chat-session-key'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export function HermesChat({ className }: { className?: string }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<'idle' | 'submitted'>('idle')
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const searchParams = useSearchParams()
  const orbStartedRef = useRef(false)

  const isLoading = status === 'submitted'
  const isEmpty = messages.length === 0

  useEffect(() => {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) setSessionKey(stored)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  const resetComposer = useCallback(() => {
    setInput('')
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    })
  }, [])

  const clearConversation = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    setMessages([])
    setSessionKey(null)
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  const submit = useCallback(
    async (text: string) => {
      const value = text.trim()
      if (!value || isLoading) return

      const controller = new AbortController()
      abortRef.current = controller

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'user', text: value },
      ])
      setStatus('submitted')
      resetComposer()

      try {
        const response = await fetch('/api/hermes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: value, sessionKey }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as {
          error?: string
          text?: string
          sessionKey?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || 'Phantom Chat failed')
        }

        if (payload.sessionKey) {
          setSessionKey(payload.sessionKey)
          window.localStorage.setItem(SESSION_STORAGE_KEY, payload.sessionKey)
        }

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: payload.text || 'I finished, but nothing came back.',
          },
        ])
      } catch (error) {
        if (controller.signal.aborted) return

        const message =
          error instanceof Error ? error.message : 'Unexpected Phantom Chat error'

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: `Error: ${message}`,
          },
        ])
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        setStatus('idle')
      }
    },
    [isLoading, resetComposer, sessionKey]
  )


  useEffect(() => {
    if (orbStartedRef.current) return
    if (searchParams.get('start') !== 'orb') return
    if (messages.length > 0 || isLoading) return

    orbStartedRef.current = true
    void submit('Open Phantom Chat from the command-center orb. Give me a brief ready status and wait for my next instruction.')
  }, [isLoading, messages.length, searchParams, submit])

  return (
    <div className={cn('flex flex-col h-full w-full min-h-0 holo-surface', className)}>
      <div className="flex items-center gap-2 px-5 h-11 flex-shrink-0 border-b border-white/8">
        <RadioIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
          Phantom
        </span>
        <span className="text-[10px] font-mono text-slate-600">
          openclaw gateway
        </span>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearConversation}
            className="ml-auto flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-mono text-slate-400 border border-white/10 bg-white/[0.03] hover:text-cyan-200 hover:border-cyan-400/30 transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New chat
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06]">
              <SparklesIcon className="w-6 h-6 text-cyan-300" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-mono font-semibold text-slate-100">
                Phantom Chat is online.
              </h1>
              <p className="text-xs font-mono text-slate-500 mt-2">
                This panel now talks to your OpenClaw gateway instead of the old Hermes bridge.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="text-left text-xs font-mono px-3.5 py-3 rounded-xl border border-white/8 bg-white/[0.02] text-slate-400 hover:text-cyan-100 hover:border-cyan-400/30 hover:bg-cyan-400/[0.04] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl w-full px-4 py-6 space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300/70 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Phantom is thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-white/8 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-cyan-500/15 bg-black/40 px-3 py-2.5 focus-within:border-cyan-400/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                adjustHeight()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit(input)
                }
              }}
              rows={1}
              placeholder="Message Phantom…"
              className="flex-1 resize-none bg-transparent font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none leading-relaxed py-1 max-h-[200px]"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
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
            Phantom can still make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] text-sm font-mono px-4 py-2.5 rounded-2xl rounded-br-md bg-cyan-400/10 border border-cyan-400/20 text-slate-100 whitespace-pre-wrap leading-relaxed">
          {message.text}
        </div>
      </div>
    )
  }


  return (
    <div className="flex gap-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] flex-shrink-0 mt-0.5">
        <RadioIcon className="w-3.5 h-3.5 text-cyan-300" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0 text-sm text-slate-200 leading-relaxed pt-0.5 hermes-prose">
        <Streamdown>{message.text}</Streamdown>
      </div>
    </div>
  )
}
