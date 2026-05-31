'use client'

import { useState } from 'react'
import { Preview } from '@/app/preview'
import { FileExplorer } from '@/app/file-explorer'
import { Logs } from '@/app/logs'
import { cn } from '@/lib/utils'
import {
  MonitorIcon,
  Code2Icon,
  TerminalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'

type View = 'preview' | 'code'

export function RightPanel() {
  const [activeView, setActiveView] = useState<View>('preview')
  const [logsOpen, setLogsOpen] = useState(false)

  return (
    <div className="flex flex-col h-full w-full gap-1.5">
      {/* Tab bar */}
      <div className="flex items-center gap-1 flex-shrink-0 px-0.5">
        <ViewTab
          active={activeView === 'preview'}
          onClick={() => setActiveView('preview')}
          icon={<MonitorIcon className="w-3.5 h-3.5" />}
          label="Preview"
        />
        <ViewTab
          active={activeView === 'code'}
          onClick={() => setActiveView('code')}
          icon={<Code2Icon className="w-3.5 h-3.5" />}
          label="Code"
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setLogsOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold uppercase transition-all duration-200 border',
            logsOpen
              ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_8px_rgba(0,200,255,0.15)]'
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
          )}
        >
          <TerminalIcon className="w-3.5 h-3.5" />
          Logs
          {logsOpen ? (
            <ChevronDownIcon className="w-3 h-3" />
          ) : (
            <ChevronUpIcon className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Stacked panels — both rendered, one in front */}
      <div className="relative flex-1 min-h-0">
        {/* Preview panel */}
        <div
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-in-out',
            activeView === 'preview'
              ? 'z-20 opacity-100 scale-100'
              : 'z-10 opacity-[0.13] scale-[0.972] pointer-events-none blur-[1.5px]'
          )}
        >
          <Preview className="h-full" />
        </div>

        {/* Code / File Explorer panel */}
        <div
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-in-out',
            activeView === 'code'
              ? 'z-20 opacity-100 scale-100'
              : 'z-10 opacity-[0.13] scale-[0.972] pointer-events-none blur-[1.5px]'
          )}
        >
          <FileExplorer className="h-full" />
        </div>
      </div>

      {/* Logs — collapsible drawer */}
      <div
        className={cn(
          'flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
          logsOpen ? 'h-44' : 'h-0'
        )}
      >
        <Logs className="h-44" />
      </div>
    </div>
  )
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold uppercase transition-all duration-200 border',
        active
          ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_14px_rgba(0,200,255,0.22)]'
          : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
      )}
    >
      {icon}
      {label}
    </button>
  )
}
