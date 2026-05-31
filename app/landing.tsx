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

/* ── the reactor core (segmented HUD orb) ───────────────────────── */
function ReactorCore() {
  const spin = (s: number, reverse = false) => ({
    transformBox: 'fill-box' as const,
    transformOrigin: 'center' as const,
    animation: `spin ${s}s linear infinite${reverse ? ' reverse' : ''}`,
  })

  return (
    <div className="relative flex items-center justify-center w-[300px] h-[300px] sm:w-[380px] sm:h-[380px]">
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full text-cyan-300"
        style={{ filter: 'drop-shadow(0 0 14px rgba(0,190,255,0.35))' }}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="32%" stopColor="rgba(160,230,255,0.7)" />
            <stop offset="70%" stopColor="rgba(0,150,220,0.35)" />
            <stop offset="100%" stopColor="rgba(0,150,220,0)" />
          </radialGradient>
        </defs>

        {/* outer hairline ring with fine ticks */}
        <g style={spin(70)}>
          <circle cx="120" cy="120" r="114" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="1.5 7" />
        </g>

        {/* segmented arc ring */}
        <g style={spin(34, true)}>
          <circle cx="120" cy="120" r="100" fill="none" stroke="currentColor" strokeOpacity="0.30" strokeWidth="2" strokeDasharray="92 65" strokeLinecap="round" />
        </g>

        {/* dense tick ring */}
        <g style={spin(48)}>
          <circle cx="120" cy="120" r="88" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="6" strokeDasharray="1 6" />
        </g>

        {/* dashed ring */}
        <g style={spin(24, true)}>
          <circle cx="120" cy="120" r="74" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="4 5" />
        </g>

        {/* orbiting node markers */}
        <g style={spin(18)}>
          {[0, 90, 180, 270].map((deg) => {
            const r = 74
            const rad = (deg * Math.PI) / 180
            return (
              <circle
                key={deg}
                cx={120 + r * Math.cos(rad)}
                cy={120 + r * Math.sin(rad)}
                r="2.5"
                fill="currentColor"
              />
            )
          })}
        </g>

        {/* mechanical reactor segments */}
        <g style={spin(16)}>
          <circle cx="120" cy="120" r="56" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="5" strokeDasharray="46 42" strokeLinecap="round" />
        </g>
        <g style={spin(20, true)}>
          <circle cx="120" cy="120" r="44" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="3" strokeDasharray="20 28" />
        </g>

        {/* core hub */}
        <circle cx="120" cy="120" r="34" fill="url(#coreGlow)" />
        <circle cx="120" cy="120" r="34" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />

        {/* crosshair */}
        <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="1">
          <line x1="120" y1="96" x2="120" y2="104" />
          <line x1="120" y1="136" x2="120" y2="144" />
          <line x1="96" y1="120" x2="104" y2="120" />
          <line x1="136" y1="120" x2="144" y2="120" />
        </g>

        {/* pulsing centre */}
        <circle cx="120" cy="120" r="5" fill="#fff" style={{ animation: 'orb-breathe 3s ease-in-out infinite', transformBox: 'fill-box', transformOrigin: 'center' }} />
      </svg>
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
  { id: 'helix', name: 'Helix Coder', desc: 'AI full-stack engineer', icon: ZapIcon, href: '/agent', status: 'online' },
  { id: 'git', name: 'Git Manager', desc: 'Repositories & commits', icon: GitBranchIcon, href: '/agent?app=git', status: 'online' },
  { id: 'vercel', name: 'Vercel', desc: 'Deployments & hosting', icon: CloudIcon, href: '/agent?app=vercel', status: 'online' },
  { id: 'supabase', name: 'Supabase', desc: 'Backend & database', icon: DatabaseIcon, href: '/agent?app=supabase', status: 'online' },
  { id: 'terminal', name: 'Terminal', desc: 'System shell', icon: TerminalIcon, status: 'soon' },
  { id: 'new', name: 'New App', desc: 'Build with Helix', icon: PlusIcon, href: '/agent', status: 'online' },
]

/* deterministic mini readout heights so SSR + client match */
const GRAPHS = [
  [0.4, 0.7, 0.5, 0.9, 0.55, 0.8],
  [0.6, 0.35, 0.75, 0.5, 0.85, 0.45],
  [0.5, 0.8, 0.4, 0.65, 0.5, 0.9],
  [0.7, 0.5, 0.85, 0.4, 0.7, 0.55],
  [0.35, 0.6, 0.45, 0.8, 0.5, 0.7],
  [0.8, 0.45, 0.6, 0.9, 0.5, 0.75],
]

function MiniGraph({ data, align }: { data: number[]; align: 'left' | 'right' }) {
  return (
    <div className={`flex items-end gap-[3px] h-4 ${align === 'right' ? 'justify-end' : ''}`}>
      {data.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-cyan-300/40 group-hover:bg-cyan-300/70 transition-colors"
          style={{
            height: `${h * 100}%`,
            animation: `eq-bar ${1.4 + (i % 3) * 0.25}s ease-in-out ${i * 0.1}s infinite`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  )
}

/* ── HUD side panel (desktop) ───────────────────────────────────── */
function HudPanel({
  app,
  index,
  side,
  onLaunch,
}: {
  app: AppDef
  index: number
  side: 'left' | 'right'
  onLaunch: (a: AppDef) => void
}) {
  const Icon = app.icon
  const num = String(index + 1).padStart(2, '0')
  const disabled = app.status !== 'online'

  const iconBox = (
    <span className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 bg-white/[0.02] flex-shrink-0 transition-all duration-300 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/[0.06]">
      <Icon
        className={`w-[18px] h-[18px] transition-colors duration-300 ${disabled ? 'text-slate-500' : 'text-slate-300 group-hover:text-white'}`}
        strokeWidth={1.5}
      />
      {app.status === 'online' && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
      )}
      {app.status === 'locked' && <LockIcon className="absolute -bottom-1 -right-1 w-3 h-3 text-slate-500" strokeWidth={1.5} />}
    </span>
  )

  const body = (
    <div className={`flex flex-col gap-1 min-w-0 ${side === 'right' ? 'items-end text-right' : ''}`}>
      <div className={`flex items-baseline gap-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-base font-mono font-light text-white/25 tabular-nums leading-none">{num}</span>
        <span className="text-[13px] font-mono tracking-wide text-slate-200 group-hover:text-white transition-colors truncate">
          {app.name}
        </span>
      </div>
      <span className="text-[10px] font-mono text-slate-500 truncate">{app.desc}</span>
      <MiniGraph data={GRAPHS[index]} align={side === 'right' ? 'right' : 'left'} />
    </div>
  )

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onLaunch(app)}
      className={`hud-panel hud-panel-${side} group relative w-[218px] px-3.5 py-3 ${
        disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span className={`hud-connector hud-connector-${side}`} aria-hidden="true" />
      <div className={`flex items-center gap-3 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        {iconBox}
        {body}
      </div>
    </button>
  )
}

/* ── dock icon (mobile) ─────────────────────────────────────────── */
function AppIcon({ app, onLaunch }: { app: AppDef; onLaunch: (a: AppDef) => void }) {
  const Icon = app.icon
  const disabled = app.status !== 'online'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onLaunch(app)}
      className={`group relative flex flex-col items-center gap-2 w-[78px] ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span className="relative flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/[0.06]">
        <Icon className={`w-[22px] h-[22px] ${disabled ? 'text-slate-500' : 'text-slate-300 group-hover:text-white'}`} strokeWidth={1.5} />
        {app.status === 'online' && (
          <span className="absolute top-2 right-2 w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
        )}
        {app.status === 'soon' && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-mono tracking-[0.15em] px-1.5 py-px rounded bg-white/5 border border-white/10 text-slate-500">
            SOON
          </span>
        )}
      </span>
      <span className="text-[10.5px] font-mono tracking-wide text-slate-400 group-hover:text-slate-200 transition-colors text-center">
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
        <div className="launch-face launch-face-front">
          <div className="flex flex-col items-center gap-3 opacity-50">
            <BrainCircuitIcon className="w-9 h-9 text-slate-300" strokeWidth={1.25} />
            <span className="text-[11px] font-mono tracking-[0.35em] text-slate-500">HELIX&nbsp;OS</span>
          </div>
        </div>
        <div className="launch-face launch-face-right">
          <div className="flex flex-col items-center gap-6">
            <span
              className="relative flex items-center justify-center w-24 h-24 rounded-3xl border border-white/12 bg-white/[0.03] shadow-[0_0_70px_-10px_rgba(0,200,255,0.45)]"
              style={{ animation: 'launch-icon-pop 850ms cubic-bezier(.34,1.56,.64,1) forwards' }}
            >
              <Icon className="w-10 h-10 text-white" strokeWidth={1.25} />
            </span>
            <div className="text-center">
              <p className="text-base font-mono font-medium text-white/90 tracking-[0.15em]">{app.name}</p>
              <p className="text-[10px] font-mono text-slate-500 mt-2 tracking-[0.4em]">LAUNCHING</p>
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
    router.prefetch(app.href)
    setTimeout(() => router.push(app.href as string), 780)
  }

  const time = clock
    ? clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--'
  const date = clock
    ? clock.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  const leftApps = apps.slice(0, 3)
  const rightApps = apps.slice(3, 6)

  /* ── boot overlay ─────────────────────────────────────────────── */
  if (booting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/50 backdrop-blur-md font-mono">
        <BrainCircuitIcon className="w-9 h-9 text-white/90 animate-pulse drop-shadow-[0_0_14px_rgba(0,200,255,0.6)]" strokeWidth={1.1} />
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
      {launching && <LaunchTransition app={launching} />}

      {/* ── TOP STATUS BAR ─────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2 text-xs font-mono border-b border-white/8 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold tracking-[0.2em] holo-title">
            <BrainCircuitIcon className="w-4 h-4 text-cyan-300" strokeWidth={1.5} />
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

      {/* ── DESKTOP / HUD ──────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 grid place-items-center min-h-0 overflow-hidden px-4">
        {/* greeting */}
        <div className="absolute top-5 left-5 sm:top-7 sm:left-9 text-left pointer-events-none z-20">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-slate-600">{date}</p>
          <p className="text-xl sm:text-3xl font-mono font-light text-white/85 mt-2 tracking-tight">Good to see you.</p>
          <p className="text-xs sm:text-sm font-mono text-slate-500 mt-1">How can I help you build today?</p>
        </div>

        {/* left HUD panels */}
        <div className="hidden lg:flex flex-col gap-4 absolute left-6 xl:left-10 top-1/2 -translate-y-1/2 z-20">
          {leftApps.map((app, i) => (
            <HudPanel key={app.id} app={app} index={i} side="left" onLaunch={launch} />
          ))}
        </div>

        {/* right HUD panels */}
        <div className="hidden lg:flex flex-col gap-4 absolute right-6 xl:right-10 top-1/2 -translate-y-1/2 z-20">
          {rightApps.map((app, i) => (
            <HudPanel key={app.id} app={app} index={i + 3} side="right" onLaunch={launch} />
          ))}
        </div>

        {/* reactor core */}
        <div className="flex flex-col items-center">
          <ReactorCore />
          <div className="mt-1 flex items-center gap-2.5 text-[10px] font-mono tracking-[0.3em] text-slate-500">
            <span className="w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
            HELIX&nbsp;ASSISTANT — STANDING&nbsp;BY
          </div>
        </div>
      </main>

      {/* ── MOBILE DOCK (hidden on lg, where panels take over) ─────── */}
      <footer className="lg:hidden relative z-20 flex flex-col items-center pb-6 pt-2 px-4">
        <p className="text-[9px] font-mono text-slate-600 tracking-[0.35em] uppercase mb-3.5">App&nbsp;Manager</p>
        <div className="flex items-end justify-center gap-1.5 sm:gap-3 flex-wrap max-w-2xl px-5 py-4 rounded-3xl border border-white/8 bg-white/[0.015] backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          {apps.map((app) => (
            <AppIcon key={app.id} app={app} onLaunch={launch} />
          ))}
        </div>
      </footer>
    </div>
  )
}
