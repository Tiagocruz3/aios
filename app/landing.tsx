'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ZapIcon,
  GitBranchIcon,
  CloudIcon,
  DatabaseIcon,
  TerminalIcon,
  BrainCircuitIcon,
  LockIcon,
  WifiIcon,
  CpuIcon,
  CircleIcon,
  PlusIcon,
} from 'lucide-react'

/* ── live clock ─────────────────────────────────────────────────── */
function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

/* ── animated system meter (mock telemetry) ─────────────────────── */
function useMeter(base: number, swing: number, speed = 2200) {
  const [v, setV] = useState(base)
  useEffect(() => {
    const t = setInterval(() => {
      setV(Math.max(2, Math.min(99, base + (Math.random() - 0.5) * swing)))
    }, speed)
    return () => clearInterval(t)
  }, [base, swing, speed])
  return Math.round(v)
}

/* ── the Jarvis orb ─────────────────────────────────────────────── */
function JarvisOrb({ listening }: { listening: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-[320px] h-[320px] sm:w-[400px] sm:h-[400px]">
      {/* outer rotating rings */}
      <div
        className="absolute inset-0 rounded-full border border-cyan-400/20"
        style={{ animation: 'spin 22s linear infinite' }}
      >
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 blur-[1px]" />
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-300/70" />
      </div>
      <div
        className="absolute inset-[8%] rounded-full border border-purple-400/15 border-dashed"
        style={{ animation: 'spin 30s linear infinite reverse' }}
      />
      <div
        className="absolute inset-[16%] rounded-full border border-cyan-400/25"
        style={{ animation: 'spin 16s linear infinite' }}
      >
        <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-300 blur-[1px]" />
      </div>

      {/* tick marks ring */}
      <div
        className="absolute inset-[24%] rounded-full"
        style={{
          animation: 'spin 40s linear infinite reverse',
          background:
            'repeating-conic-gradient(from 0deg, rgba(0,200,255,0.25) 0deg 1deg, transparent 1deg 9deg)',
          WebkitMask: 'radial-gradient(circle, transparent 60%, black 61%, black 100%)',
          mask: 'radial-gradient(circle, transparent 60%, black 61%, black 100%)',
        }}
      />

      {/* glowing core */}
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: '46%',
          height: '46%',
          background:
            'radial-gradient(circle at 50% 40%, rgba(120,230,255,0.9), rgba(0,170,255,0.55) 40%, rgba(40,0,120,0.25) 75%, transparent 100%)',
          boxShadow: listening
            ? '0 0 80px rgba(0,210,255,0.65), inset 0 0 50px rgba(120,230,255,0.5)'
            : '0 0 50px rgba(0,200,255,0.4), inset 0 0 40px rgba(80,200,255,0.35)',
          animation: 'orb-breathe 4s ease-in-out infinite',
        }}
      >
        {/* inner swirling plasma */}
        <div
          className="absolute inset-2 rounded-full opacity-70"
          style={{
            background:
              'conic-gradient(from 0deg, transparent, rgba(140,240,255,0.5), transparent, rgba(160,120,255,0.4), transparent)',
            animation: 'spin 6s linear infinite',
            filter: 'blur(6px)',
          }}
        />
        <BrainCircuitIcon className="relative w-10 h-10 sm:w-12 sm:h-12 text-white/90 drop-shadow-[0_0_8px_rgba(0,220,255,0.9)]" />
      </div>

      {/* equaliser bars under core when "listening" */}
      <div className="absolute bottom-[20%] flex items-end gap-1 h-6">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-cyan-400/80"
            style={{
              height: '100%',
              animation: `eq-bar 1.1s ease-in-out ${i * 0.12}s infinite`,
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── app registry ───────────────────────────────────────────────── */
type AppDef = {
  id: string
  name: string
  desc: string
  icon: typeof ZapIcon
  href?: string
  status: 'online' | 'soon' | 'locked'
  accent: string
}

const apps: AppDef[] = [
  {
    id: 'helix',
    name: 'Helix Coder',
    desc: 'AI full-stack engineer',
    icon: ZapIcon,
    href: '/agent',
    status: 'online',
    accent: 'cyan',
  },
  {
    id: 'git',
    name: 'Git Manager',
    desc: 'Repos & commits',
    icon: GitBranchIcon,
    href: '/agent?app=git',
    status: 'online',
    accent: 'purple',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    desc: 'Deployments',
    icon: CloudIcon,
    href: '/agent?app=vercel',
    status: 'online',
    accent: 'slate',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    desc: 'Backend & DB',
    icon: DatabaseIcon,
    href: '/agent?app=supabase',
    status: 'online',
    accent: 'emerald',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    desc: 'System shell',
    icon: TerminalIcon,
    status: 'soon',
    accent: 'slate',
  },
  {
    id: 'new',
    name: 'New App',
    desc: 'Build with Helix',
    icon: PlusIcon,
    href: '/agent',
    status: 'online',
    accent: 'cyan',
  },
]

const accentMap: Record<string, { ring: string; icon: string; bg: string; glow: string }> = {
  cyan: {
    ring: 'border-cyan-500/40',
    icon: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    glow: 'group-hover:shadow-[0_0_24px_rgba(0,200,255,0.35)]',
  },
  purple: {
    ring: 'border-purple-500/40',
    icon: 'text-purple-300',
    bg: 'bg-purple-500/10',
    glow: 'group-hover:shadow-[0_0_24px_rgba(168,85,247,0.3)]',
  },
  emerald: {
    ring: 'border-emerald-500/40',
    icon: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    glow: 'group-hover:shadow-[0_0_24px_rgba(52,211,153,0.3)]',
  },
  slate: {
    ring: 'border-slate-500/40',
    icon: 'text-slate-300',
    bg: 'bg-slate-500/10',
    glow: 'group-hover:shadow-[0_0_24px_rgba(148,163,184,0.25)]',
  },
}

function AppIcon({ app, onLaunch }: { app: AppDef; onLaunch: (a: AppDef) => void }) {
  const a = accentMap[app.accent]
  const Icon = app.icon
  const disabled = app.status === 'soon' || app.status === 'locked'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onLaunch(app)}
      className={`group relative flex flex-col items-center gap-2 w-[88px] sm:w-[104px] ${
        disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        className={`relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border ${a.ring} ${a.bg} backdrop-blur-md transition-all duration-200 ${
          disabled ? '' : `group-hover:scale-110 ${a.glow}`
        }`}
      >
        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${a.icon}`} />
        {app.status === 'online' && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black/60 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        )}
        {app.status === 'soon' && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-mono px-1 rounded bg-black/70 border border-slate-600/50 text-slate-400">
            SOON
          </span>
        )}
        {app.status === 'locked' && (
          <LockIcon className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-slate-500 bg-black/70 rounded-full p-0.5" />
        )}
      </span>
      <span className="text-[11px] font-mono text-slate-300 group-hover:text-cyan-200 transition-colors text-center leading-tight">
        {app.name}
      </span>
    </button>
  )
}

/* ── 3D cube launch transition ──────────────────────────────────── */
function LaunchTransition({ app }: { app: AppDef }) {
  const a = accentMap[app.accent]
  const Icon = app.icon
  return (
    <div className="launch-scene">
      <div className="launch-cube">
        {/* front face = the desktop turning away */}
        <div className="launch-face launch-face-front">
          <div className="flex flex-col items-center gap-3 opacity-60">
            <BrainCircuitIcon className="w-10 h-10 text-cyan-300/80" />
            <span className="text-xs font-mono tracking-[0.3em] text-cyan-400/60">
              HELIX&nbsp;OS
            </span>
          </div>
        </div>

        {/* right face = the app swinging in */}
        <div className="launch-face launch-face-right">
          <div className="flex flex-col items-center gap-5">
            <span
              className={`relative flex items-center justify-center w-24 h-24 rounded-3xl border ${a.ring} ${a.bg} shadow-[0_0_60px_rgba(0,200,255,0.3)]`}
              style={{ animation: 'launch-icon-pop 850ms cubic-bezier(.34,1.56,.64,1) forwards' }}
            >
              <Icon className={`w-11 h-11 ${a.icon}`} />
            </span>
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-white/90 tracking-wide">
                {app.name}
              </p>
              <p className="text-xs font-mono text-cyan-400/70 mt-1 tracking-[0.25em]">
                LAUNCHING
              </p>
            </div>
            <div className="w-44 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="launch-progress h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const router = useRouter()
  const clock = useClock()
  const cpu = useMeter(34, 30)
  const mem = useMeter(58, 18)
  const net = useMeter(12, 24)
  const [booting, setBooting] = useState(true)
  const [bootLine, setBootLine] = useState(0)
  const [launching, setLaunching] = useState<AppDef | null>(null)

  const bootLines = [
    'INITIALISING HELIX KERNEL...',
    'LOADING NEURAL CORE...',
    'MOUNTING AI MODULES...',
    'ESTABLISHING SECURE LINK...',
    'COMMAND CENTRE ONLINE.',
  ]

  useEffect(() => {
    if (bootLine < bootLines.length) {
      const t = setTimeout(() => setBootLine((l) => l + 1), 360)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setBooting(false), 500)
    return () => clearTimeout(t)
  }, [bootLine, bootLines.length])

  const launch = (app: AppDef) => {
    if (!app.href || launching) return
    setLaunching(app)
    // Prefetch then navigate once the cube has rotated into the app face.
    router.prefetch(app.href)
    setTimeout(() => router.push(app.href as string), 780)
  }

  const time = clock
    ? clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--'
  const date = clock
    ? clock.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  /* ── boot overlay ─────────────────────────────────────────────── */
  if (booting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm font-mono">
        <BrainCircuitIcon className="w-10 h-10 text-cyan-300 animate-pulse mb-2 drop-shadow-[0_0_12px_rgba(0,220,255,0.8)]" />
        <div className="flex flex-col gap-1 text-xs text-cyan-400/80 w-[280px]">
          {bootLines.slice(0, bootLine).map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              {l}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-screen max-h-screen overflow-hidden select-none">
      {/* ── 3D cube launch transition ──────────────────────────────── */}
      {launching && <LaunchTransition app={launching} />}

      {/* ── TOP STATUS BAR (menu bar) ──────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2 text-xs font-mono border-b border-cyan-500/15 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold tracking-[0.2em] holo-title">
            <BrainCircuitIcon className="w-4 h-4 text-cyan-300" />
            HELIX&nbsp;OS
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-500">Command Centre</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-slate-400">
          <span className="hidden sm:flex items-center gap-1.5" title="CPU load">
            <CpuIcon className="w-3.5 h-3.5 text-cyan-400/70" />
            {cpu}%
          </span>
          <span className="hidden sm:flex items-center gap-1.5" title="Memory">
            <CircleIcon className="w-3 h-3 text-purple-400/70" />
            MEM {mem}%
          </span>
          <span className="hidden md:flex items-center gap-1.5" title="Network">
            <WifiIcon className="w-3.5 h-3.5 text-emerald-400/70" />
            {net} Mb/s
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {time}
          </span>
        </div>
      </header>

      {/* ── DESKTOP ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden px-4">
        {/* greeting */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-8 text-left pointer-events-none">
          <p className="text-xs font-mono text-slate-500">{date}</p>
          <p className="text-lg sm:text-2xl font-mono font-bold text-white/80 mt-1">
            Good to see you.
          </p>
          <p className="text-xs sm:text-sm font-mono text-cyan-400/70 mt-0.5">
            How can I help you build today?
          </p>
        </div>

        {/* orb */}
        <JarvisOrb listening />

        {/* status under orb */}
        <div className="mt-2 flex items-center gap-2 text-xs font-mono text-cyan-400/70">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          HELIX ASSISTANT — STANDING BY
        </div>
      </main>

      {/* ── APP DOCK / LAUNCHER ────────────────────────────────────── */}
      <footer className="relative z-20 flex flex-col items-center pb-5 pt-2 px-4">
        <p className="text-[10px] font-mono text-slate-600 tracking-[0.25em] uppercase mb-3">
          App Manager
        </p>
        <div className="flex items-end justify-center gap-2 sm:gap-4 flex-wrap max-w-3xl px-4 py-3 rounded-2xl border border-cyan-500/15 bg-black/30 backdrop-blur-xl shadow-[0_0_40px_rgba(0,150,255,0.08)]">
          {apps.map((app) => (
            <AppIcon key={app.id} app={app} onLaunch={launch} />
          ))}
        </div>
      </footer>
    </div>
  )
}
