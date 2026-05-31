'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import {
  GitBranchIcon,
  KeyRoundIcon,
  PlusIcon,
  Trash2Icon,
  LockIcon,
  GlobeIcon,
  RefreshCwIcon,
  FolderIcon,
  FileIcon,
  ChevronLeftIcon,
  SaveIcon,
  FilePlusIcon,
  LogOutIcon,
  Loader2Icon,
  ExternalLinkIcon,
} from 'lucide-react'
import {
  HOLOGRAPHIC_THEME,
  getLanguage,
} from '@/components/file-explorer/monaco-editor'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import {
  getUser,
  listRepos,
  createRepo,
  deleteRepo,
  getContents,
  getFile,
  putFile,
  deleteFile,
  type GhUser,
  type GhRepo,
  type GhContentEntry,
} from './github-api'
import { cn } from '@/lib/utils'

const PAT_KEY = 'helix-github-pat'

interface OpenFile {
  path: string
  sha: string
  content: string
  dirty: boolean
}

/* ── New-file inline form ────────────────────────────────────────── */
function NewFileForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-cyan-500/15 bg-cyan-500/5">
      <FileIcon className="w-3.5 h-3.5 text-cyan-500/60 flex-shrink-0" />
      <input
        ref={ref}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) onSubmit(name.trim())
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="filename.ts"
        className="flex-1 min-w-0 bg-transparent text-xs font-mono text-slate-200 focus:outline-none placeholder:text-slate-600"
      />
      <button
        type="button"
        onClick={() => name.trim() && onSubmit(name.trim())}
        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 transition-colors px-1"
      >
        OK
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors px-1"
      >
        ✕
      </button>
    </div>
  )
}

/* ── Root component ──────────────────────────────────────────────── */
export function GitManager({ className }: { className?: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<GhUser | null>(null)

  useEffect(() => {
    const saved =
      process.env.NEXT_PUBLIC_GITHUB_TOKEN || localStorage.getItem(PAT_KEY)
    if (saved) setToken(saved)
  }, [])

  const handleConnect = useCallback(async (pat: string) => {
    const u = await getUser(pat)
    localStorage.setItem(PAT_KEY, pat)
    setToken(pat)
    setUser(u)
  }, [])

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(PAT_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (token && !user) {
      getUser(token)
        .then(setUser)
        .catch(() => handleDisconnect())
    }
  }, [token, user, handleDisconnect])

  return (
    <div className={cn('flex flex-col h-full w-full overflow-hidden bg-[#0a0f16]', className)}>
      <div className="flex items-center gap-2 px-3 h-9 flex-shrink-0 border-b border-white/8 bg-[#080c12]">
        <GitBranchIcon className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
          Git Manager
        </span>
        {user && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[0.7rem] font-mono text-slate-400">@{user.login}</span>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 text-[0.65rem] font-mono text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOutIcon className="w-3 h-3" /> Disconnect
            </button>
          </div>
        )}
      </div>

      {!token || !user ? (
        <ConnectScreen onConnect={handleConnect} />
      ) : (
        <RepoWorkspace token={token} user={user} />
      )}
    </div>
  )
}

/* ── Connect screen ──────────────────────────────────────────────── */
function ConnectScreen({ onConnect }: { onConnect: (pat: string) => Promise<void> }) {
  const [pat, setPat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    if (!pat.trim()) return
    setBusy(true)
    setError(null)
    try { await onConnect(pat.trim()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to connect') }
    finally { setBusy(false) }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
            <KeyRoundIcon className="w-6 h-6 text-cyan-300" />
          </div>
          <h2 className="text-sm font-semibold text-slate-100">Connect to GitHub</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Paste a Personal Access Token with <code className="text-cyan-400">repo</code> and{' '}
            <code className="text-cyan-400">delete_repo</code> scopes.
          </p>
        </div>
        <div className="space-y-2">
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full font-mono text-xs h-9 px-3 bg-black/40 border border-cyan-500/20 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder:text-slate-600"
          />
          {error && <p className="text-[0.7rem] text-red-400 font-mono">{error}</p>}
          <button
            onClick={connect}
            disabled={busy || !pat.trim()}
            className={cn(
              'w-full h-9 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2',
              busy || !pat.trim()
                ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_14px_rgba(0,210,255,0.35)]'
            )}
          >
            {busy ? <><Loader2Icon className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : 'Connect'}
          </button>
        </div>
        <a
          href="https://github.com/settings/tokens/new?scopes=repo,delete_repo&description=Helix%20Git%20Manager"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[0.7rem] font-mono text-cyan-500/80 hover:text-cyan-300 transition-colors"
        >
          <ExternalLinkIcon className="w-3 h-3" />
          Create a token (repo + delete_repo scopes)
        </a>
      </div>
    </div>
  )
}

/* ── Repo workspace (list + create + delete) ─────────────────────── */
function RepoWorkspace({ token, user }: { token: string; user: GhUser }) {
  const [repos, setRepos] = useState<GhRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeRepo, setActiveRepo] = useState<GhRepo | null>(null)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)

  // delete-modal state
  const [repoToDelete, setRepoToDelete] = useState<GhRepo | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadRepos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setRepos(await listRepos(token)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load repos') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadRepos() }, [loadRepos])

  const handleCreate = async (name: string, isPrivate: boolean) => {
    const repo = await createRepo(token, name, isPrivate)
    setCreating(false)
    await loadRepos()
    setActiveRepo(repo)
  }

  const confirmDelete = async () => {
    if (!repoToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteRepo(token, repoToDelete.owner.login, repoToDelete.name)
      if (activeRepo?.id === repoToDelete.id) setActiveRepo(null)
      setRepoToDelete(null)
      await loadRepos()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete repository')
    } finally {
      setDeleting(false)
    }
  }

  if (activeRepo) {
    return (
      <RepoExplorer
        token={token}
        repo={activeRepo}
        onBack={() => setActiveRepo(null)}
      />
    )
  }

  const visible = repos.filter((r) =>
    r.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <>
      {repoToDelete && (
        <ConfirmDeleteModal
          title={`Delete repository`}
          description={`This will permanently delete "${repoToDelete.full_name}" and all its contents. This action cannot be undone.`}
          confirmLabel={repoToDelete.name}
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => { setRepoToDelete(null); setDeleteError(null) }}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter repositories…"
            className="flex-1 font-mono text-xs h-8 px-3 bg-black/40 border border-cyan-500/15 rounded-md text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-slate-600"
          />
          <button
            onClick={loadRepos}
            title="Refresh"
            className="flex items-center justify-center w-8 h-8 rounded-md text-cyan-600 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
          >
            <RefreshCwIcon className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all shadow-[0_0_12px_rgba(0,210,255,0.3)]"
          >
            <PlusIcon className="w-3.5 h-3.5" /> New repo
          </button>
        </div>

        {creating && (
          <CreateRepoForm onCancel={() => setCreating(false)} onCreate={handleCreate} />
        )}

        {/* Repo grid — folder-style library */}
        <div className="flex-1 min-h-0 overflow-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2Icon className="w-5 h-5 text-cyan-500 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-400 font-mono p-4">{error}</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-slate-600 font-mono p-4">No repositories found.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {visible.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => setActiveRepo(repo)}
                  className="repo-folder group relative flex flex-col gap-2 p-3 cursor-pointer"
                >
                  {/* hover actions */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Open on GitHub"
                      className="text-slate-500 hover:text-cyan-300 transition-colors"
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRepoToDelete(repo) }}
                      title="Delete repository"
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2Icon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* folder icon */}
                  <div className="flex items-center justify-between">
                    <FolderIcon className="w-9 h-9 text-cyan-400/70 group-hover:text-cyan-300 transition-colors" strokeWidth={1.25} />
                    {repo.private
                      ? <LockIcon className="w-3 h-3 text-amber-500/70" />
                      : <GlobeIcon className="w-3 h-3 text-emerald-500/70" />
                    }
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-slate-200 truncate">{repo.name}</p>
                    <p className="text-[0.65rem] text-slate-600 truncate mt-0.5">
                      {repo.description || repo.default_branch}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-1 border-t border-white/5 flex-shrink-0">
          <span className="text-[0.65rem] font-mono text-slate-600">
            {repos.length} repositories · @{user.login}
          </span>
        </div>
      </div>
    </>
  )
}

function CreateRepoForm({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, isPrivate: boolean) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try { await onCreate(name.trim(), isPrivate) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to create repo'); setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-3 border-b border-white/5 bg-cyan-500/5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
        placeholder="repository-name"
        className="font-mono text-xs h-8 px-3 bg-black/40 border border-cyan-500/20 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder:text-slate-600"
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
          <input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} className="accent-cyan-500" />
          <LockIcon className="w-3 h-3" /> Private
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
          <input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="accent-cyan-500" />
          <GlobeIcon className="w-3 h-3" /> Public
        </label>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={onCancel} className="h-7 px-2.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className={cn(
              'h-7 px-3 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
              busy || !name.trim() ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 text-black'
            )}
          >
            {busy && <Loader2Icon className="w-3 h-3 animate-spin" />} Create
          </button>
        </div>
      </div>
      {error && <p className="text-[0.7rem] text-red-400 font-mono">{error}</p>}
    </div>
  )
}

/* ── Repo explorer (files + editor) ─────────────────────────────── */
function RepoExplorer({
  token,
  repo,
  onBack,
}: {
  token: string
  repo: GhRepo
  onBack: () => void
}) {
  const owner = repo.owner.login
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<GhContentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<OpenFile | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [addingFile, setAddingFile] = useState(false)

  // file delete modal
  const [fileToDelete, setFileToDelete] = useState<GhContentEntry | null>(null)
  const [fileDeleteError, setFileDeleteError] = useState<string | null>(null)
  const [fileDeleting, setFileDeleting] = useState(false)

  const monaco = useMonaco()
  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('holographic', HOLOGRAPHIC_THEME)
    monaco.editor.setTheme('holographic')
  }, [monaco])

  const loadDir = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    try { setEntries(await getContents(token, owner, repo.name, p)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load files') }
    finally { setLoading(false) }
  }, [token, owner, repo.name])

  useEffect(() => { loadDir(path) }, [path, loadDir])

  const openFile = async (entry: GhContentEntry) => {
    try {
      const { content, sha } = await getFile(token, owner, repo.name, entry.path)
      setOpen({ path: entry.path, sha, content, dirty: false })
      setSaveError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open file')
    }
  }

  const saveFile = async () => {
    if (!open) return
    setSaving(true)
    setSaveError(null)
    try {
      await putFile(token, owner, repo.name, open.path, open.content, `Update ${open.path} via Helix`, open.sha || undefined)
      const { sha } = await getFile(token, owner, repo.name, open.path)
      setOpen({ ...open, sha, dirty: false })
      await loadDir(path)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const createFile = async (name: string) => {
    const fullPath = path ? `${path}/${name}` : name
    setAddingFile(false)
    try {
      await putFile(token, owner, repo.name, fullPath, '', `Create ${fullPath} via Helix`)
      await loadDir(path)
      const { content, sha } = await getFile(token, owner, repo.name, fullPath)
      setOpen({ path: fullPath, sha, content, dirty: false })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create file')
    }
  }

  const confirmFileDelete = async () => {
    if (!fileToDelete) return
    setFileDeleting(true)
    setFileDeleteError(null)
    try {
      await deleteFile(token, owner, repo.name, fileToDelete.path, `Delete ${fileToDelete.path} via Helix`, fileToDelete.sha)
      if (open?.path === fileToDelete.path) setOpen(null)
      setFileToDelete(null)
      await loadDir(path)
    } catch (e) {
      setFileDeleteError(e instanceof Error ? e.message : 'Failed to delete file')
    } finally {
      setFileDeleting(false)
    }
  }

  const goUp = () => {
    const parts = path.split('/').filter(Boolean)
    parts.pop()
    setPath(parts.join('/'))
  }

  return (
    <>
      {fileToDelete && (
        <ConfirmDeleteModal
          title="Delete file"
          description={`Permanently delete "${fileToDelete.path}" from this repository. This cannot be undone.`}
          confirmLabel={fileToDelete.name}
          busy={fileDeleting}
          error={fileDeleteError}
          onConfirm={confirmFileDelete}
          onCancel={() => { setFileToDelete(null); setFileDeleteError(null) }}
        />
      )}

      <div className="flex-1 flex min-h-0">
        {/* File tree */}
        <div className="flex flex-col w-[230px] flex-shrink-0 border-r border-white/5 bg-[#0c1018]">
          <div className="flex items-center gap-1.5 px-2 py-2 border-b border-white/5">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-6 h-6 rounded text-cyan-600 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all flex-shrink-0"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-cyan-200 truncate flex-1">{repo.name}</span>
            <button
              onClick={() => setAddingFile(true)}
              title="New file"
              className="flex items-center justify-center w-6 h-6 rounded text-cyan-600 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all flex-shrink-0"
            >
              <FilePlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center px-2 py-1 border-b border-white/5 min-h-[26px]">
            <span className="text-[0.65rem] font-mono text-slate-500 truncate">/{path}</span>
          </div>

          <div className="flex-1 min-h-0 overflow-auto py-1">
            {addingFile && (
              <NewFileForm onSubmit={createFile} onCancel={() => setAddingFile(false)} />
            )}
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2Icon className="w-4 h-4 text-cyan-500 animate-spin" />
              </div>
            ) : error ? (
              <p className="text-[0.7rem] text-red-400 font-mono px-3 py-2">{error}</p>
            ) : (
              <>
                {path && (
                  <button
                    onClick={goUp}
                    className="flex items-center gap-1.5 w-full px-3 py-1 text-xs text-slate-400 hover:bg-white/5 transition-colors"
                  >
                    <FolderIcon className="w-3.5 h-3.5 text-cyan-600/60" /> ..
                  </button>
                )}
                {entries.map((entry) => (
                  <div
                    key={entry.path}
                    className={cn(
                      'group flex items-center gap-1.5 px-3 py-1 cursor-pointer transition-colors',
                      open?.path === entry.path
                        ? 'bg-cyan-500/15 text-cyan-200'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    )}
                    onClick={() => entry.type === 'dir' ? setPath(entry.path) : openFile(entry)}
                  >
                    {entry.type === 'dir'
                      ? <FolderIcon className="w-3.5 h-3.5 text-cyan-500/60 flex-shrink-0" />
                      : <FileIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    }
                    <span className="text-xs truncate flex-1">{entry.name}</span>
                    {entry.type === 'file' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setFileToDelete(entry) }}
                        title="Delete file"
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
                      >
                        <Trash2Icon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#000d1a]">
          {open ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-[#0a0f16] flex-shrink-0">
                <FileIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-200 truncate flex-1">
                  {open.path}
                  {open.dirty && <span className="text-amber-400 ml-1">●</span>}
                </span>
                {saveError && (
                  <span className="text-[10px] font-mono text-red-400 truncate max-w-[200px]">{saveError}</span>
                )}
                <button
                  onClick={saveFile}
                  disabled={saving || !open.dirty}
                  className={cn(
                    'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition-all',
                    saving || !open.dirty
                      ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  )}
                >
                  {saving ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
                  Commit
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={getLanguage(open.path)}
                  value={open.content}
                  theme="holographic"
                  onChange={(value) =>
                    setOpen((prev) => prev ? { ...prev, content: value ?? '', dirty: true } : prev)
                  }
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: '"Geist Mono", "Cascadia Code", "Fira Code", monospace',
                    fontLigatures: true,
                    padding: { top: 12, bottom: 12 },
                    automaticLayout: true,
                    smoothScrolling: true,
                    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full">
                      <div className="holo-loader" />
                    </div>
                  }
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <FileIcon className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-600 font-mono">Select a file to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
