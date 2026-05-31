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
          width: '44%',
          height: '44%',
          background:
            'radial-gradient(circle at 50% 38%, rgba(255,255,255,0.95), rgba(150,225,255,0.7) 35%, rgba(0,150,220,0.4) 68%, transparent 100%)',
          boxShadow: listening
            ? '0 0 70px -6px rgba(0,200,255,0.5), inset 0 0 44px rgba(180,235,255,0.4)'
            : '0 0 46px -8px rgba(0,190,255,0.35), inset 0 0 36px rgba(150,220,255,0.3)',
          animation: 'orb-breathe 5s ease-in-out infinite',
        }}
      >
        {/* inner swirling plasma */}
        <div
          className="absolute inset-2 rounded-full opacity-60"
          style={{
            background:
              'conic-gradient(from 0deg, transparent, rgba(190,240,255,0.6), transparent, rgba(120,200,255,0.35), transparent)',
            animation: 'spin 7s linear infinite',
            filter: 'blur(7px)',
          }}
        />
        <BrainCircuitIcon
          className="relative w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
          strokeWidth={1.25}
        />
      </div>

      {/* equaliser bars under core when "listening" */}
      <div className="absolute bottom-[20%] flex items-end gap-1 h-5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className="w-px sm:w-0.5 rounded-full bg-cyan-200/70"
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
}

const apps: AppDef[] = [
  {
    id: 'helix',
    name: 'Helix Coder',
    desc: 'AI full-stack engineer',
    icon: ZapIcon,
    href: '/agent',
    status: 'online',
  },
  {
    id: 'git',
    name: 'Git Manager',
    desc: 'Repos & commits',
    icon: GitBranchIcon,
    href: '/agent?app=git',
    status: 'online',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    desc: 'Deployments',
    icon: CloudIcon,
    href: '/agent?app=vercel',
    status: 'online',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    desc: 'Backend & DB',
    icon: DatabaseIcon,
    href: '/agent?app=supabase',
    status: 'online',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    desc: 'System shell',
    icon: TerminalIcon,
    status: 'soon',
  },
  {
    id: 'new',
    name: 'New App',
    desc: 'Build with Helix',
    icon: PlusIcon,
    href: '/agent',
    status: 'online',
  },
]

function AppIcon({ app, onLaunch }: { app: AppDef; onLaunch: (a: AppDef) => void }) {
  const Icon = app.icon
  const disabled = app.status === 'soon' || app.status === 'locked'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onLaunch(app)}
      className={`group relative flex flex-col items-center gap-2.5 w-[84px] sm:w-[100px] ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        className={`relative flex items-center justify-center w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md transition-all duration-300 ${
          disabled
            ? ''
            : 'group-hover:scale-105 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/[0.06] group-hover:shadow-[0_0_28px_-4px_rgba(0,200,255,0.4)]'
        }`}
      >
        <Icon
          className={`w-[22px] h-[22px] sm:w-6 sm:h-6 transition-colors duration-300 ${
            disabled
              ? 'text-slate-500'
              : 'text-slate-300 group-hover:text-white'
          }`}
          strokeWidth={1.5}
        />
        {app.status === 'online' && (
          <span className="absolute top-2 right-2 w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
        )}
        {app.status === 'soon' && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-mono tracking-[0.15em] px-1.5 py-px rounded bg-white/5 border border-white/10 text-slate-500">
            SOON
          </span>
        )}
        {app.status === 'locked' && (
          <LockIcon className="absolute top-2 right-2 w-3 h-3 text-slate-500" strokeWidth={1.5} />
        )}
      </span>
      <span className="text-[10.5px] font-mono tracking-wide text-slate-400 group-hover:text-slate-200 transition-colors text-center leading-tight">
        {app.name}
      </span>
    </button>
  )
}

/* ── 3D cube launch transition ──────────────────────────────────── */
function LaunchTransition({ app }: { app: AppDef }) {
  const Icon = app.icon
  return (
    <div className="launch-scene">
      <div className="launch-cube">
        {/* front face = the desktop turning away */}
        <div className="launch-face launch-face-front">
          <div className="flex flex-col items-center gap-3 opacity-50">
            <BrainCircuitIcon className="w-9 h-9 text-slate-300" strokeWidth={1.25} />
            <span className="text-[11px] font-mono tracking-[0.35em] text-slate-500">
              HELIX&nbsp;OS
            </span>
          </div>
        </div>

        {/* right face = the app swinging in */}
        <div className="launch-face launch-face-right">
          <div className="flex flex-col items-center gap-6">
            <span
              className="relative flex items-center justify-center w-24 h-24 rounded-3xl border border-white/12 bg-white/[0.03] shadow-[0_0_70px_-10px_rgba(0,200,255,0.45)]"
              style={{ animation: 'launch-icon-pop 850ms cubic-bezier(.34,1.56,.64,1) forwards' }}
            >
              <Icon className="w-10 h-10 text-white" strokeWidth={1.25} />
            </span>
            <div className="text-center">
              <p className="text-base font-mono font-medium text-white/90 tracking-[0.15em]">
                {app.name}
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-2 tracking-[0.4em]">
                LAUNCHING
              </p>
            </div>
            <div className="w-40 h-px bg-white/10 overflow-hidden">
              <div className="launch-progress h-full bg-cyan-300/90" />
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/50 backdrop-blur-md font-mono">
        <BrainCircuitIcon
          className="w-9 h-9 text-white/90 animate-pulse drop-shadow-[0_0_14px_rgba(0,200,255,0.6)]"
          strokeWidth={1.1}
        />
        <div className="flex flex-col gap-1.5 text-[11px] tracking-[0.15em] text-slate-400 w-[290px]">
          {bootLines.slice(0, bootLine).map((l, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-cyan-300/80">›</span>
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

        <div className="flex items-center gap-4 sm:gap-5 text-slate-500">
          <span className="hidden sm:flex items-center gap-1.5" title="CPU load">
            <CpuIcon className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
            <span className="tabular-nums">{cpu}%</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5" title="Memory">
            <CircleIcon className="w-3 h-3 text-slate-500" strokeWidth={1.5} />
            <span className="tabular-nums">MEM {mem}%</span>
          </span>
          <span className="hidden md:flex items-center gap-1.5" title="Network">
            <WifiIcon className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
            <span className="tabular-nums">{net} Mb/s</span>
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
            <span className="tabular-nums tracking-wide">{time}</span>
          </span>
        </div>
      </header>

      {/* ── DESKTOP ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden px-4">
        {/* greeting */}
        <div className="absolute top-5 left-5 sm:top-7 sm:left-9 text-left pointer-events-none">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-slate-600">
            {date}
          </p>
          <p className="text-xl sm:text-3xl font-mono font-light text-white/85 mt-2 tracking-tight">
            Good to see you.
          </p>
          <p className="text-xs sm:text-sm font-mono text-slate-500 mt-1">
            How can I help you build today?
          </p>
        </div>

        {/* orb */}
        <JarvisOrb listening />

        {/* status under orb */}
        <div className="mt-2 flex items-center gap-2.5 text-[10px] font-mono tracking-[0.3em] text-slate-500">
          <span className="w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
          HELIX ASSISTANT — STANDING BY
        </div>
      </main>

      {/* ── APP DOCK / LAUNCHER ────────────────────────────────────── */}
      <footer className="relative z-20 flex flex-col items-center pb-6 pt-2 px-4">
        <p className="text-[9px] font-mono text-slate-600 tracking-[0.35em] uppercase mb-3.5">
          App&nbsp;Manager
        </p>
        <div className="flex items-end justify-center gap-1.5 sm:gap-3 flex-wrap max-w-3xl px-5 py-4 rounded-3xl border border-white/8 bg-white/[0.015] backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          {apps.map((app) => (
            <AppIcon key={app.id} app={app} onLaunch={launch} />
          ))}
        </div>
      </footer>
    </div>
  )
}
