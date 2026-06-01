'use client'

import { useEffect, useState } from 'react'
import { ZapIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon, WifiOffIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'connected'; url: string; toolCount: number; toolNames: string[] }
  | { state: 'disconnected'; reason: string }

export function N8nStatus() {
  const [status, setStatus] = useState<Status>({ state: 'idle' })

  async function probe() {
    setStatus({ state: 'loading' })
    try {
      const res = await fetch('/api/n8n/status')
      const data = await res.json()
      if (data.connected) {
        setStatus({ state: 'connected', url: data.url, toolCount: data.toolCount, toolNames: data.toolNames ?? [] })
      } else {
        setStatus({ state: 'disconnected', reason: data.reason ?? 'Unknown error' })
      }
    } catch {
      setStatus({ state: 'disconnected', reason: 'Failed to reach /api/n8n/status' })
    }
  }

  useEffect(() => { probe() }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ZapIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider">n8n MCP</span>
        </div>
        <button onClick={probe} disabled={status.state === 'loading'}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-cyan-300 transition-colors disabled:opacity-40">
          <RefreshCwIcon className={cn('w-3 h-3', status.state === 'loading' && 'animate-spin')} />
          Probe
        </button>
      </div>

      {status.state === 'idle' && (
        <p className="text-[10px] font-mono text-slate-600">Checking…</p>
      )}

      {status.state === 'loading' && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
          Connecting to n8n…
        </div>
      )}

      {status.state === 'connected' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>Connected · {status.toolCount} workflow{status.toolCount !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-[10px] font-mono text-slate-600 truncate">{status.url}</p>
          {status.toolNames.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {status.toolNames.map(name => (
                <span key={name}
                  className="px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/20 text-[9px] font-mono text-cyan-300 truncate max-w-[160px]">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {status.state === 'disconnected' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-mono text-red-400">
            {status.reason === 'N8N_MCP_URL not set'
              ? <WifiOffIcon className="w-3.5 h-3.5" />
              : <XCircleIcon className="w-3.5 h-3.5" />}
            <span>{status.reason === 'N8N_MCP_URL not set' ? 'Not configured' : 'Unreachable'}</span>
          </div>
          {status.reason !== 'N8N_MCP_URL not set' && (
            <p className="text-[9px] font-mono text-slate-600 leading-relaxed">{status.reason}</p>
          )}
          {status.reason === 'N8N_MCP_URL not set' && (
            <p className="text-[9px] font-mono text-slate-600 leading-relaxed">
              Set <code className="text-slate-400">N8N_MCP_URL</code> and optionally{' '}
              <code className="text-slate-400">N8N_API_KEY</code> in your environment to enable n8n workflow tools.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
