'use client'

import { useWelcomeStore } from '@/components/modals/welcome'
import { DnaIcon, PlusIcon, GithubIcon, InfoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

const btnCls =
  'flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-mono font-semibold text-slate-400 border border-cyan-500/15 bg-black/30 hover:text-cyan-200 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all cursor-pointer select-none'

export function Header({ className }: Props) {
  const { open, setOpen } = useWelcomeStore()

  const handleNew = () => {
    // Fresh session: clear the persisted prompt and reload from the root.
    window.localStorage.removeItem('prompt-input')
    window.location.assign('/')
  }

  return (
    <header className={cn('flex items-center justify-between', className)}>
      {/* Brand */}
      <div className="flex items-center gap-2 ml-1 md:ml-2">
        <span className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,200,255,0.2)]">
          <DnaIcon className="w-4 h-4 text-cyan-300" />
        </span>
        <span className="text-sm font-mono font-bold tracking-[0.25em] holo-title">
          HELIX
        </span>
        <span className="holo-pulse-dot" />
      </div>

      {/* Functional actions */}
      <div className="flex items-center ml-auto gap-1.5">
        <button
          type="button"
          onClick={handleNew}
          title="Start a new session"
          className={btnCls}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">New</span>
        </button>

        <a
          href="https://github.com/tiagocruz3/aios"
          target="_blank"
          rel="noopener noreferrer"
          title="View source on GitHub"
          className={btnCls}
        >
          <GithubIcon className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">GitHub</span>
        </a>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          title="About Helix"
          className={btnCls}
        >
          <InfoIcon className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">About</span>
        </button>
      </div>
    </header>
  )
}
