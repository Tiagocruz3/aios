'use client'

import { useCallback, useEffect, useState } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import {
  DatabaseIcon,
  KeyRoundIcon,
  PlusIcon,
  Trash2Icon,
  RefreshCwIcon,
  ExternalLinkIcon,
  LogOutIcon,
  Loader2Icon,
  ChevronLeftIcon,
  PlayIcon,
  CircleDotIcon,
  KeySquareIcon,
} from 'lucide-react'
import { HOLOGRAPHIC_THEME } from '@/components/file-explorer/monaco-editor'
import {
  getOrganizations,
  listProjects,
  createProject,
  deleteProject,
  getApiKeys,
  runQuery,
  SUPABASE_REGIONS,
  type SbOrganization,
  type SbProject,
  type SbApiKey,
} from './supabase-api'
import { cn } from '@/lib/utils'

const TOKEN_KEY = 'helix-supabase-token'

const STARTER_SQL = `-- Create a table for the app backend
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table todos enable row level security;

-- Allow anonymous read/write (adjust for production)
create policy "public access" on todos for all using (true) with check (true);
`

export function SupabaseManager({ className }: { className?: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) setToken(saved)
  }, [])

  const handleConnect = useCallback(async (tok: string) => {
    // Validate by listing organizations.
    await getOrganizations(tok)
    localStorage.setItem(TOKEN_KEY, tok)
    setToken(tok)
    setConnected(true)
  }, [])

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setConnected(false)
  }, [])

  useEffect(() => {
    if (token && !connected) {
      getOrganizations(token)
        .then(() => setConnected(true))
        .catch(() => handleDisconnect())
    }
  }, [token, connected, handleDisconnect])

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full overflow-hidden rounded-lg border border-cyan-500/15 holo-surface',
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 h-9 flex-shrink-0 border-b border-white/8 bg-[#080c12]">
        <DatabaseIcon className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
          Supabase Manager
        </span>
        {connected && (
          <button
            onClick={handleDisconnect}
            title="Disconnect"
            className="ml-auto flex items-center gap-1 text-[0.65rem] font-mono text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOutIcon className="w-3 h-3" />
            Disconnect
          </button>
        )}
      </div>

      {!token || !connected ? (
        <ConnectScreen onConnect={handleConnect} />
      ) : (
        <ProjectWorkspace token={token} />
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
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <KeyRoundIcon className="w-6 h-6 text-emerald-300" />
          </div>
          <h2 className="text-sm font-semibold text-slate-100">
            Connect to Supabase
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Paste a Supabase Personal Access Token to manage projects and build
            your backend with SQL. It is stored only in this browser and talks
            directly to Supabase.
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="password"
            value={tok}
            onChange={(e) => setTok(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            placeholder="sbp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full font-mono text-xs h-9 px-3 bg-black/40 border border-emerald-500/20 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-slate-600"
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
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_14px_rgba(16,185,129,0.35)]'
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
          href="https://supabase.com/dashboard/account/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[0.7rem] font-mono text-emerald-500/80 hover:text-emerald-300 transition-colors"
        >
          <ExternalLinkIcon className="w-3 h-3" />
          Create a Supabase access token
        </a>
      </div>
    </div>
  )
}

function ProjectWorkspace({ token }: { token: string }) {
  const [projects, setProjects] = useState<SbProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [active, setActive] = useState<SbProject | null>(null)

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

  const handleDelete = async (project: SbProject) => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`))
      return
    try {
      await deleteProject(token, project.id)
      if (active?.id === project.id) setActive(null)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete project')
    }
  }

  if (active) {
    return (
      <ProjectBackend
        token={token}
        project={active}
        onBack={() => setActive(null)}
      />
    )
  }

  const visible = projects.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
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
          className="flex items-center justify-center w-8 h-8 rounded-md text-emerald-500 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
        >
          <RefreshCwIcon className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          New project
        </button>
      </div>

      {creating && (
        <CreateProjectForm
          token={token}
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            await load()
          }}
        />
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2Icon className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-xs text-red-400 font-mono p-4">{error}</p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-slate-600 font-mono p-4">
            No projects found.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {visible.map((project) => {
              const ready = project.status === 'ACTIVE_HEALTHY'
              return (
                <li
                  key={project.id}
                  className="group flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setActive(project)}
                >
                  <CircleDotIcon
                    className={cn(
                      'w-3.5 h-3.5 flex-shrink-0',
                      ready ? 'text-emerald-500/80' : 'text-amber-500/70'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-semibold text-slate-200 truncate">
                      {project.name}
                    </p>
                    <p className="text-[0.7rem] text-slate-500 truncate">
                      {project.region} · {project.status.toLowerCase()}
                    </p>
                  </div>
                  <a
                    href={`https://supabase.com/dashboard/project/${project.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open dashboard"
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-300 transition-all flex-shrink-0"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(project)
                    }}
                    title="Delete project"
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="px-3 py-1 border-t border-white/5 flex-shrink-0">
        <span className="text-[0.65rem] font-mono text-slate-600">
          {projects.length} projects
        </span>
      </div>
    </div>
  )
}

function CreateProjectForm({
  token,
  onCreated,
  onCancel,
}: {
  token: string
  onCreated: () => Promise<void>
  onCancel: () => void
}) {
  const [orgs, setOrgs] = useState<SbOrganization[]>([])
  const [name, setName] = useState('')
  const [orgId, setOrgId] = useState('')
  const [dbPass, setDbPass] = useState('')
  const [region, setRegion] = useState('us-east-1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getOrganizations(token)
      .then((o) => {
        setOrgs(o)
        if (o[0]) setOrgId(o[0].id)
      })
      .catch(() => {})
  }, [token])

  const submit = async () => {
    if (!name.trim() || !orgId || !dbPass.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createProject(token, {
        name: name.trim(),
        organization_id: orgId,
        db_pass: dbPass,
        region,
      })
      await onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project')
      setBusy(false)
    }
  }

  const inputCls =
    'font-mono text-xs h-8 px-2.5 bg-black/40 border border-emerald-500/20 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-slate-600'

  return (
    <div className="flex flex-col gap-2 px-3 py-3 border-b border-white/5 bg-emerald-500/5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        placeholder="project name"
        className={inputCls}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className={inputCls}
        >
          {orgs.length === 0 && <option value="">Loading orgs…</option>}
          {orgs.map((o) => (
            <option key={o.id} value={o.id} className="bg-[#0a0f16]">
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={inputCls}
        >
          {SUPABASE_REGIONS.map((r) => (
            <option key={r} value={r} className="bg-[#0a0f16]">
              {r}
            </option>
          ))}
        </select>
      </div>
      <input
        type="password"
        value={dbPass}
        onChange={(e) => setDbPass(e.target.value)}
        placeholder="database password (keep it safe)"
        className={inputCls}
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
          disabled={busy || !name.trim() || !orgId || !dbPass.trim()}
          className={cn(
            'h-7 px-3 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
            busy || !name.trim() || !orgId || !dbPass.trim()
              ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
          )}
        >
          {busy && <Loader2Icon className="w-3 h-3 animate-spin" />}
          Create
        </button>
      </div>
      <p className="text-[0.65rem] text-slate-500 font-mono">
        Provisioning takes a couple of minutes.
      </p>
      {error && <p className="text-[0.7rem] text-red-400 font-mono">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Project backend — SQL editor + API keys                            */
/* ------------------------------------------------------------------ */

function ProjectBackend({
  token,
  project,
  onBack,
}: {
  token: string
  project: SbProject
  onBack: () => void
}) {
  const [sql, setSql] = useState(STARTER_SQL)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)
  const [keys, setKeys] = useState<SbApiKey[]>([])
  const [showKeys, setShowKeys] = useState(false)

  const monaco = useMonaco()
  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('holographic', HOLOGRAPHIC_THEME)
    monaco.editor.setTheme('holographic')
  }, [monaco])

  const run = async () => {
    if (!sql.trim()) return
    setRunning(true)
    setResult(null)
    setResultError(null)
    try {
      const rows = await runQuery(token, project.id, sql)
      setResult(JSON.stringify(rows, null, 2))
    } catch (e) {
      setResultError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setRunning(false)
    }
  }

  const loadKeys = async () => {
    setShowKeys((v) => !v)
    if (keys.length === 0) {
      try {
        setKeys(await getApiKeys(token, project.id))
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Sub header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-white/5 flex-shrink-0">
        <button
          onClick={onBack}
          title="Back to projects"
          className="flex items-center justify-center w-6 h-6 rounded text-emerald-500 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </button>
        <DatabaseIcon className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-mono font-bold text-cyan-200 truncate flex-1">
          {project.name}
        </span>
        <button
          onClick={loadKeys}
          title="API keys"
          className={cn(
            'flex items-center gap-1 h-7 px-2 rounded-md text-[0.7rem] font-mono transition-all',
            showKeys
              ? 'text-emerald-300 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          )}
        >
          <KeySquareIcon className="w-3.5 h-3.5" />
          Keys
        </button>
        <button
          onClick={run}
          disabled={running || !sql.trim()}
          className={cn(
            'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition-all',
            running || !sql.trim()
              ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
          )}
        >
          {running ? (
            <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PlayIcon className="w-3.5 h-3.5" />
          )}
          Run SQL
        </button>
      </div>

      {showKeys && (
        <div className="px-3 py-2 border-b border-white/5 bg-black/30 space-y-1">
          {keys.length === 0 ? (
            <p className="text-[0.7rem] text-slate-500 font-mono">
              No keys loaded.
            </p>
          ) : (
            keys.map((k) => (
              <div
                key={k.name}
                className="flex items-center gap-2 text-[0.7rem] font-mono"
              >
                <span className="text-emerald-400 w-20 flex-shrink-0">
                  {k.name}
                </span>
                <code className="text-slate-400 truncate flex-1">
                  {k.api_key}
                </code>
                <button
                  onClick={() => navigator.clipboard?.writeText(k.api_key)}
                  className="text-slate-500 hover:text-cyan-300 flex-shrink-0"
                  title="Copy"
                >
                  copy
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* SQL editor */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center px-3 py-1 border-b border-white/5 flex-shrink-0">
          <span className="text-[0.6rem] font-mono uppercase tracking-wider text-slate-500">
            SQL Editor — build & code your backend
          </span>
        </div>
        <div className="flex-[2] min-h-0">
          <Editor
            height="100%"
            language="sql"
            value={sql}
            theme="holographic"
            onChange={(v) => setSql(v ?? '')}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily:
                '"Geist Mono", "Cascadia Code", "Fira Code", monospace',
              fontLigatures: true,
              padding: { top: 12, bottom: 12 },
              automaticLayout: true,
              smoothScrolling: true,
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="holo-loader" />
              </div>
            }
          />
        </div>

        {/* Result */}
        <div className="flex-1 min-h-0 flex flex-col border-t border-white/5">
          <div className="flex items-center px-3 py-1 border-b border-white/5 flex-shrink-0">
            <span className="text-[0.6rem] font-mono uppercase tracking-wider text-slate-500">
              Result
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-3">
            {resultError ? (
              <pre className="text-[0.7rem] font-mono text-red-400 whitespace-pre-wrap">
                {resultError}
              </pre>
            ) : result ? (
              <pre className="text-[0.7rem] font-mono text-emerald-300/90 whitespace-pre-wrap">
                {result}
              </pre>
            ) : (
              <p className="text-[0.7rem] font-mono text-slate-600">
                Run a query to see results.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
