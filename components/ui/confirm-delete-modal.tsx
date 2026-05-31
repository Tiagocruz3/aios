'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangleIcon, XIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  description: string
  confirmLabel: string // the value the user must type to confirm
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/* Shared type-to-confirm deletion modal used by the Git & Vercel managers. */
export function ConfirmDeleteModal({
  title,
  description,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const ready = typed === confirmLabel

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,4,12,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md border border-red-500/25 bg-[#09050f] shadow-[0_0_60px_-10px_rgba(239,68,68,0.35)]"
        style={{
          clipPath:
            'polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex-shrink-0">
              <AlertTriangleIcon className="w-5 h-5 text-red-400" />
            </span>
            <div>
              <h2 className="text-sm font-mono font-semibold text-white/90">{title}</h2>
              <p className="text-xs font-mono text-slate-500 mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">
              Type <span className="text-red-400 font-semibold">{confirmLabel}</span> to confirm
            </label>
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ready && !busy && onConfirm()}
              spellCheck={false}
              autoComplete="off"
              className="w-full font-mono text-xs h-9 px-3 bg-black/60 border border-white/10 rounded-md text-slate-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 placeholder:text-slate-700"
              placeholder={confirmLabel}
            />
          </div>

          {error && (
            <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-8 px-4 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!ready || busy}
              className={cn(
                'flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-mono font-semibold transition-all',
                ready && !busy
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.35)]'
                  : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
              )}
            >
              {busy && <Loader2Icon className="w-3.5 h-3.5 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
