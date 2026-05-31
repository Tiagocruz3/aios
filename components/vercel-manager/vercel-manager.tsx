'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  TriangleIcon,
  KeyRoundIcon,
  PlusIcon,
  Trash2Icon,
  RefreshCwIcon,
  ExternalLinkIcon,
  LogOutIcon,
  Loader2Icon,
} from 'lucide-react'
import {
  getVercelUser,
  listProjects,
  createProject,
  deleteProject,
  liveUrl,
  thumbnailUrl,
  type VercelUser,
  type VercelProject,
} from './vercel-api'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import { cn } from '@/lib/utils'

const TOKEN_KEY = 'helix-vercel-token'

export function VercelManager({ className }: { className?: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<VercelUser | null>(null)

  useEffect(() => {
    const saved =
      process.env.NEXT_PUBLIC_VERCEL_TOKEN || localStorage.getItem(TOKEN_KEY)
    if (saved) setToken(saved)
  }, [])

  const handleConnect = useCallback(async (tok: string) => {
    const u = await getVercelUser(tok)
    localStorage.setItem(TOKEN_KEY, tok)
    setToken(tok)
    setUser(u)
  }, [])

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (token && !user) {
      getVercelUser(token)
        .then(setUser)
        .catch(() => handleDisconnect())
    }
  }, [token, user, handleDisconnect])

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full overflow-hidden rounded-lg border border-cyan-500/15 bg-[#0a0f16]',
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 h-9 flex-shrink-0 border-b border-white/8 bg-[#080c12]">
        <TriangleIcon className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
          Vercel Manager
        </span>
        {user && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[0.7rem] font-mono text-slate-400">
              {user.username}
            </span>
            <button
              onClick={handleDisconnect}
              title="Disconnect"
              className="flex items-center gap-1 text-[0.65rem] font-mono text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOutIcon className="w-3 h-3" />
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!token || !user ? (
        <ConnectScreen onConnect={handleConnect} />
      ) : (
        <ProjectWorkspace token={token} user={user} />
      )}
    </div>
  )
}

function ConnectScreen({
  onConnect,
}: {
  onConnect: (token: string) => Promise<void>
}) {
  const [tok, setTok] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    if (!tok.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onConnect(tok.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
            <KeyRoundIcon className="w-6 h-6 text-cyan-300" />
          </div>
          <h2 className="text-sm font-semibold text-slate-100">
            Connect to Vercel
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Paste a Vercel Access Token to manage your projects. It is stored
            only in this browser and talks directly to Vercel.
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="password"
            value={tok}
            onChange={(e) => setTok(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            placeholder="vercel access token"
            className="w-full font-mono text-xs h-9 px-3 bg-black/40 border border-cyan-500/20 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder:text-slate-600"
          />
          {error && (
            <p className="text-[0.7rem] text-red-400 font-mono">{error}</p>
          )}
          <button
            onClick={connect}
            disabled={busy || !tok.trim()}
            className={cn(
              'w-full h-9 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2',
              busy || !tok.trim()
                ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_14px_rgba(0,210,255,0.35)]'
            )}
          >
            {busy ? (
              <>
                <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                Connecting…
              </>
            ) : (
              'Connect'
            )}
          </button>
        </div>

        <a
          href="https://vercel.com/account/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[0.7rem] font-mono text-cyan-500/80 hover:text-cyan-300 transition-colors"
        >
          <ExternalLinkIcon className="w-3 h-3" />
          Create a Vercel access token
        </a>
      </div>
    </div>
  )
}

function ProjectWorkspace({
  token,
  user,
}: {
  token: string
  user: VercelUser
}) {
  const [projects, setProjects] = useState<VercelProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)

  // delete-modal state
  const [toDelete, setToDelete] = useState<VercelProject | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProjects(await listProjects(token))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (name: string) => {
    await createProject(token, name)
    setCreating(false)
    await load()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteProject(token, toDelete.id)
      setToDelete(null)
      await load()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  const visible = projects.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <>
      {toDelete && (
        <ConfirmDeleteModal
          title="Delete project"
          description={`This permanently deletes the Vercel project "${toDelete.name}" and all its deployments. This cannot be undone.`}
          confirmLabel={toDelete.name}
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => { setToDelete(null); setDeleteError(null) }}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter projects…"
            className="flex-1 font-mono text-xs h-8 px-3 bg-black/40 border border-cyan-500/15 rounded-md text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-slate-600"
          />
          <button
            onClick={load}
            title="Refresh"
            className="flex items-center justify-center w-8 h-8 rounded-md text-cyan-600 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
          >
            <RefreshCwIcon className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all shadow-[0_0_12px_rgba(0,210,255,0.3)]"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New project
          </button>
        </div>

        {creating && (
          <CreateProjectForm
            onCancel={() => setCreating(false)}
            onCreate={handleCreate}
          />
        )}

        {/* Thumbnail grid — deployed app previews */}
        <div className="flex-1 min-h-0 overflow-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2Icon className="w-5 h-5 text-cyan-500 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-400 font-mono p-4">{error}</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-slate-600 font-mono p-4">No projects found.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  user={user}
                  onDelete={() => setToDelete(project)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-1 border-t border-white/5 flex-shrink-0">
          <span className="text-[0.65rem] font-mono text-slate-600">
            {projects.length} projects · {user.username}
          </span>
        </div>
      </div>
    </>
  )
}

/* ── Project card with live thumbnail ───────────────────────────── */
function ProjectCard({
  project,
  user,
  onDelete,
}: {
  project: VercelProject
  user: VercelUser
  onDelete: () => void
}) {
  const url = liveUrl(project)
  const ready = project.latestDeployments?.[0]?.readyState === 'READY'
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-white/8 bg-white/[0.015] hover:border-cyan-400/30 hover:bg-cyan-400/[0.03] transition-all duration-300 hover:shadow-[0_0_24px_-8px_rgba(0,200,255,0.4)]">
      {/* thumbnail */}
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'relative block aspect-[16/10] overflow-hidden bg-[#070b11]',
          !url && 'pointer-events-none'
        )}
      >
        {url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl(url)}
            alt={`${project.name} preview`}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-slate-700">
            <TriangleIcon className="w-8 h-8 fill-slate-700/40" />
            <span className="text-[0.65rem] font-mono">
              {url ? 'preview unavailable' : 'no deployment'}
            </span>
          </div>
        )}

        {/* status dot */}
        <span className="absolute top-2 left-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              ready
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                : 'bg-slate-500'
            )}
          />
          <span className="text-[0.6rem] font-mono text-slate-300">
            {ready ? 'Ready' : 'Idle'}
          </span>
        </span>

        {/* hover actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={`https://vercel.com/${user.username}/${project.name}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open dashboard"
            className="flex items-center justify-center w-6 h-6 rounded bg-black/60 backdrop-blur-sm text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <TriangleIcon className="w-3 h-3" />
          </a>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
            title="Delete project"
            className="flex items-center justify-center w-6 h-6 rounded bg-black/60 backdrop-blur-sm text-slate-400 hover:text-red-400 transition-colors"
          >
            <Trash2Icon className="w-3 h-3" />
          </button>
        </div>
      </a>

      {/* meta */}
      <div className="flex items-center gap-2 px-3 py-2.5 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono font-semibold text-slate-200 truncate">
            {project.name}
          </p>
          <p className="text-[0.65rem] text-slate-500 truncate">
            {project.framework ?? 'no framework'}
            {url && ` · ${url.replace('https://', '')}`}
          </p>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open live deployment"
            className="text-slate-500 hover:text-cyan-300 transition-colors flex-shrink-0"
          >
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function CreateProjectForm({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onCreate(name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-3 border-b border-white/5 bg-cyan-500/5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
        placeholder="project-name"
        className="font-mono text-xs h-8 px-3 bg-black/40 border border-cyan-500/20 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder:text-slate-600"
      />
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={onCancel}
          className="h-7 px-2.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
          className={cn(
            'h-7 px-3 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
            busy || !name.trim()
              ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black'
          )}
        >
          {busy && <Loader2Icon className="w-3 h-3 animate-spin" />}
          Create
        </button>
      </div>
      {error && <p className="text-[0.7rem] text-red-400 font-mono">{error}</p>}
    </div>
  )
}
