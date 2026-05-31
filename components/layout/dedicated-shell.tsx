'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, BrainCircuitIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  icon: ReactNode
  children: ReactNode
}

/* Full-screen shell for a dedicated manager page launched from the
   command centre. Provides a thin top bar with a back-to-dashboard
   link and Helix branding; the manager fills the remaining height. */
export function DedicatedShell({ title, icon, children }: Props) {
  const router = useRouter()
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="flex items-center justify-between flex-shrink-0 px-4 py-2.5 border-b border-white/8 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-mono text-slate-400 border border-white/10 bg-white/[0.03] hover:text-cyan-200 hover:border-cyan-400/30 hover:bg-cyan-400/[0.06] transition-all cursor-pointer"
            title="Back to Command Centre"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Command Centre</span>
          </button>
          <span className="hidden sm:block w-px h-4 bg-white/10" />
          <span className="flex items-center gap-2 text-sm font-mono tracking-wide text-slate-200">
            {icon}
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-[0.2em] holo-title">
          <BrainCircuitIcon className="w-4 h-4 text-cyan-300" strokeWidth={1.5} />
          HELIX&nbsp;OS
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  )
}
