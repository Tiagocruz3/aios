'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  GitBranchIcon,
  SearchIcon,
  FolderGitIcon,
  LockIcon,
  Loader2Icon,
  DownloadIcon,
  CheckIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { listRepos, type GhRepo } from './github-api'
import { useSandboxStore } from '@/app/state'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSettings } from '@/components/settings/use-settings'
import { cn } from '@/lib/utils'

const PAT_KEY = 'helix-github-pat'

type LoadState = 'idle' | 'loading' | 'done'

export function RepoLoader({ className }: { className?: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [repos, setRepos] = useState<GhRepo[]>([])
  const [query, setQuery] = useState('')
  const [listing, setListing] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [busyRepo, setBusyRepo] = useState<number | null>(null)
  const [loadedRepo, setLoadedRepo] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { setSandboxId, addPaths, sandboxId } = useSandboxStore()
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()

  useEffect(() => {
    const t = process.env.NEXT_PUBLIC_GITHUB_TOKEN || localStorage.getItem(PAT_KEY)
    setToken(t)
  }, [])

  const refresh = useCallback(async (t: string) => {
    setListing(true)
    setListError(null)
    try {
      const data = await listRepos(t)
      setRepos(data)
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to list repositories')
    } finally {
      setListing(false)
    }
  }, [])

  useEffect(() => {
    if (token) refresh(token)
  }, [token, refresh])

  const loadRepo = async (repo: GhRepo) => {
    setBusyRepo(repo.id)
    setLoadError(null)
    try {
      const res = await fetch('/api/sandboxes/load-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
          branch: repo.default_branch,
          token: token || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load repository')

      // Point the IDE at the new sandbox and populate the file tree.
      setSandboxId(data.sandboxId)
      if (Array.isArray(data.paths)) addPaths(data.paths)
      setLoadedRepo(repo.full_name)

      // Prime the agent: tell it to operate on this sandbox + repo.
      chat.sendMessage(
        {
          text:
            `I've loaded the GitHub repository **${repo.full_name}** ` +
            `(branch \`${repo.default_branch}\`) into the active Vercel Sandbox ` +
            `with sandboxId \`${data.sandboxId}\`. The repository is checked out at ` +
            `the sandbox working directory root.\n\n` +
            `Use this existing sandboxId for all \`Run Command\` calls — do NOT ` +
            `create a new sandbox. Start by exploring the project structure and ` +
            `summarising what the project does and how to run it.`,
        },
        { body: { modelId, reasoningEffort } }
      )
    } catch (e) {
      setLoadError(
        `${repo.full_name}: ${e instanceof Error ? e.message : 'Failed to load'}`
      )
    } finally {
      setBusyRepo(null)
    }
  }

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(query.toLowerCase())
  )

  /* ── no token ─────────────────────────────────────────────────── */
  if (token === null) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full gap-3 text-center px-6', className)}>
        <LockIcon className="w-8 h-8 text-slate-700" strokeWidth={1.5} />
        <p className="text-sm font-mono text-slate-400">No GitHub token found</p>
        <p className="text-[11px] font-mono text-slate-600 max-w-xs leading-relaxed">
          Set <code className="text-cyan-400/80">NEXT_PUBLIC_GITHUB_TOKEN</code> in your
          environment, or add a token in the dedicated Git Manager, to load repositories
          into the coder.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0 holo-surface', className)}>
      {/* header / search */}
      <div className="flex items-center gap-2 px-3 h-11 flex-shrink-0 border-b border-white/8">
        <GitBranchIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" strokeWidth={1.5} />
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories…"
            className="w-full h-7 pl-7 pr-2 bg-black/40 border border-white/8 rounded-md font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/30"
          />
        </div>
        <button
          type="button"
          onClick={() => token && refresh(token)}
          disabled={listing}
          title="Refresh"
          className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-cyan-300 hover:bg-cyan-400/10 transition-all flex-shrink-0 disabled:opacity-40"
        >
          <RefreshCwIcon className={cn('w-3.5 h-3.5', listing && 'animate-spin')} />
        </button>
      </div>

      {/* loaded / error banners */}
      {loadedRepo && (
        <div className="flex items-start gap-2 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border-b border-emerald-500/20 px-3 py-2">
          <CheckIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <strong>{loadedRepo}</strong> loaded into the coder — the agent is now working
            on it. Check the chat and Code tab.
          </span>
        </div>
      )}
      {loadError && (
        <div className="flex items-start gap-2 text-[11px] font-mono text-red-400 bg-red-500/10 border-b border-red-500/20 px-3 py-2">
          <AlertTriangleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* repo list */}
      <div className="flex-1 min-h-0 overflow-auto p-2">
        {listError && (
          <div className="flex items-start gap-2 text-[11px] font-mono text-red-400 m-2">
            <AlertTriangleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{listError}</span>
          </div>
        )}

        {listing && repos.length === 0 && (
          <div className="flex items-center justify-center gap-2 h-full text-xs font-mono text-slate-500">
            <Loader2Icon className="w-4 h-4 animate-spin" /> Loading repositories…
          </div>
        )}

        {!listing && filtered.length === 0 && !listError && (
          <div className="flex items-center justify-center h-full text-xs font-mono text-slate-600">
            No repositories match.
          </div>
        )}

        <div className="space-y-1">
          {filtered.map((repo) => {
            const isBusy = busyRepo === repo.id
            return (
              <div
                key={repo.id}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-white/6 bg-white/[0.015] hover:border-cyan-400/25 transition-all"
              >
                <FolderGitIcon className="w-4 h-4 text-cyan-400/60 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-slate-200 truncate">{repo.name}</span>
                    {repo.private && <LockIcon className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 truncate block">
                    {repo.owner.login} · {repo.default_branch}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => loadRepo(repo)}
                  disabled={isBusy || busyRepo !== null}
                  className={cn(
                    'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-mono font-semibold transition-all flex-shrink-0',
                    isBusy
                      ? 'bg-cyan-400/10 text-cyan-300 cursor-wait'
                      : 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 hover:bg-cyan-400/20 disabled:opacity-30'
                  )}
                >
                  {isBusy ? (
                    <>
                      <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> Cloning…
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-3.5 h-3.5" /> Load
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {sandboxId && (
        <div className="flex-shrink-0 border-t border-white/8 px-3 py-1.5 text-[10px] font-mono text-slate-600 truncate">
          Active sandbox: <span className="text-slate-400">{sandboxId}</span>
        </div>
      )}
    </div>
  )
}
