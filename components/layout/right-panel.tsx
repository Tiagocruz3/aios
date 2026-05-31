'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Preview } from '@/app/preview'
import { FileExplorer } from '@/app/file-explorer'
import { Logs } from '@/app/logs'
import { SupabaseManager } from '@/components/supabase-manager/supabase-manager'
import { cn } from '@/lib/utils'
import {
  MonitorIcon,
  Code2Icon,
  DatabaseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'

type View = 'preview' | 'code' | 'supabase'

const VALID_VIEWS: View[] = ['preview', 'code', 'supabase']

export function RightPanel() {
  const params = useSearchParams()
  const requested = params.get('app')
  const initialView: View = VALID_VIEWS.includes(requested as View)
    ? (requested as View)
    : 'preview'
  const [activeView, setActiveView] = useState<View>(initialView)
  const [logsOpen, setLogsOpen] = useState(false)

  return (
    <div className="flex flex-col h-full w-full">
      {/* Lovable-style prominent top bar */}
      <div className="flex items-stretch flex-shrink-0 h-10 border-b border-white/8 bg-[#080c12]">
        <div className="flex items-stretch overflow-x-auto">
          <ViewTab
            active={activeView === 'preview'}
            onClick={() => setActiveView('preview')}
            icon={<MonitorIcon className="w-4 h-4" />}
            label="Preview"
          />
          <ViewTab
            active={activeView === 'code'}
            onClick={() => setActiveView('code')}
            icon={<Code2Icon className="w-4 h-4" />}
            label="Code"
          />
          <ViewTab
            active={activeView === 'supabase'}
            onClick={() => setActiveView('supabase')}
            icon={<DatabaseIcon className="w-4 h-4" />}
            label="Supabase"
          />
        </div>

        <div className="flex-1" />

        {/* Terminal toggle — only in code view */}
        {activeView === 'code' && (
          <button
            type="button"
            onClick={() => setLogsOpen(!logsOpen)}
            className={cn(
              'flex items-center gap-1.5 px-3 text-xs font-mono border-l border-white/8 transition-colors',
              logsOpen
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5'
            )}
          >
            {logsOpen ? (
              <ChevronDownIcon className="w-3.5 h-3.5" />
            ) : (
              <ChevronUpIcon className="w-3.5 h-3.5" />
            )}
            Terminal
          </button>
        )}
      </div>

      {/* View content */}
      <div className="flex-1 min-h-0 relative">
        <ViewLayer active={activeView === 'preview'}>
          <Preview />
        </ViewLayer>
        <ViewLayer active={activeView === 'code'}>
          <FileExplorer />
        </ViewLayer>
        <ViewLayer active={activeView === 'supabase'}>
          <SupabaseManager />
        </ViewLayer>
      </div>

      {/* Logs drawer — slides up over code view */}
      {logsOpen && activeView === 'code' && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 z-30 border-t border-cyan-500/20 bg-[#05080d] shadow-2xl">
          <Logs />
        </div>
      )}
    </div>
  )
}

// ─── View Tab ──────────────────────────────────────────────────────
interface ViewTabProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ViewTab({ active, onClick, icon, label }: ViewTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 text-sm font-mono border-r border-white/8 transition-all whitespace-nowrap',
        active
          ? 'text-cyan-300 bg-cyan-500/10 border-b-2 border-b-cyan-400'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── View Layer (depth effect) ─────────────────────────────────────
interface ViewLayerProps {
  active: boolean
  children: React.ReactNode
}

function ViewLayer({ active, children }: ViewLayerProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 transition-all duration-500',
        active
          ? 'opacity-100 z-20 scale-100 blur-0'
          : 'opacity-0 z-10 scale-[0.98] blur-sm pointer-events-none'
      )}
    >
      {children}
    </div>
  )
}
