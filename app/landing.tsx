'use client'

import { useEffect, useLayoutEffect, useRef, useState, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ZapIcon, GitBranchIcon, CloudIcon, DatabaseIcon,
  VideoIcon, BrainCircuitIcon, LockIcon,
  WifiIcon, CpuIcon, CircleIcon, LayersIcon, AtomIcon,
} from 'lucide-react'

/* ── clock ─────────────────────────────────────────────────────── */
function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

/* ── telemetry meter ────────────────────────────────────────────── */
function useMeter(base: number, swing: number, speed = 2200) {
  const [v, setV] = useState(base)
  useEffect(() => {
    const t = setInterval(
      () => setV(Math.max(2, Math.min(99, base + (Math.random() - 0.5) * swing))),
      speed
    )
    return () => clearInterval(t)
  }, [base, swing, speed])
  return Math.round(v)
}

/* ── reactor core SVG ───────────────────────────────────────────── */
function ReactorCore({ divRef }: { divRef: React.Ref<HTMLDivElement> }) {
  const spin = (s: number, rev = false) => ({
    transformBox: 'fill-box' as const,
    transformOrigin: 'center' as const,
    animation: `spin ${s}s linear infinite${rev ? ' reverse' : ''}`,
  })
  return (
    <div
      ref={divRef}
      className="relative flex items-center justify-center w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]"
    >
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full text-cyan-300"
        style={{ filter: 'drop-shadow(0 0 16px rgba(0,190,255,0.4))' }}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="42%" r="58%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.98)" />
            <stop offset="30%"  stopColor="rgba(170,235,255,0.75)" />
            <stop offset="68%"  stopColor="rgba(0,155,225,0.38)" />
            <stop offset="100%" stopColor="rgba(0,155,225,0)" />
          </radialGradient>
        </defs>

        {/* outermost hairline tick ring */}
        <g style={spin(72)}>
          <circle cx="120" cy="120" r="115" fill="none"
            stroke="currentColor" strokeOpacity="0.10" strokeWidth="1"
            strokeDasharray="1.5 7" />
        </g>

        {/* segmented arc ring */}
        <g style={spin(34, true)}>
          <circle cx="120" cy="120" r="100" fill="none"
            stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.5"
            strokeDasharray="88 68" strokeLinecap="round" />
        </g>

        {/* dense tick ring */}
        <g style={spin(50)}>
          <circle cx="120" cy="120" r="88" fill="none"
            stroke="currentColor" strokeOpacity="0.32" strokeWidth="6"
            strokeDasharray="1 6" />
        </g>

        {/* fine dashed ring */}
        <g style={spin(26, true)}>
          <circle cx="120" cy="120" r="74" fill="none"
            stroke="currentColor" strokeOpacity="0.16" strokeWidth="1"
            strokeDasharray="3.5 5.5" />
        </g>

        {/* orbiting quad nodes */}
        <g style={spin(18)}>
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180
            return (
              <circle key={deg}
                cx={120 + 74 * Math.cos(rad)} cy={120 + 74 * Math.sin(rad)}
                r="2.5" fill="currentColor" />
            )
          })}
        </g>

        {/* inner mechanical segments */}
        <g style={spin(16)}>
          <circle cx="120" cy="120" r="56" fill="none"
            stroke="currentColor" strokeOpacity="0.55" strokeWidth="5"
            strokeDasharray="44 44" strokeLinecap="round" />
        </g>
        <g style={spin(22, true)}>
          <circle cx="120" cy="120" r="43" fill="none"
            stroke="currentColor" strokeOpacity="0.40" strokeWidth="3"
            strokeDasharray="19 29" />
        </g>

        {/* core hub */}
        <circle cx="120" cy="120" r="33" fill="url(#coreGlow)" />
        <circle cx="120" cy="120" r="33" fill="none"
          stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />

        {/* crosshair */}
        <g stroke="currentColor" strokeOpacity="0.45" strokeWidth="1">
          <line x1="120" y1="97"  x2="120" y2="105" />
          <line x1="120" y1="135" x2="120" y2="143" />
          <line x1="97"  y1="120" x2="105" y2="120" />
          <line x1="135" y1="120" x2="143" y2="120" />
        </g>

        {/* pulsing centre */}
        <circle cx="120" cy="120" r="5" fill="#fff"
          style={{ animation: 'orb-breathe 3s ease-in-out infinite',
                   transformBox: 'fill-box', transformOrigin: 'center' }} />
      </svg>
    </div>
  )
}

/* ── app registry ───────────────────────────────────────────────── */
type AppDef = {
  id: string; name: string; desc: string
  icon: typeof ZapIcon; href?: string; status: 'online' | 'soon' | 'locked'
}

const apps: AppDef[] = [
  { id: 'helix',    name: 'Helix Coder',  desc: 'AI full-stack engineer',   icon: ZapIcon,        href: '/agent',            status: 'online' },
  { id: 'hermes',   name: 'Hermes Chat',  desc: 'AI assistant',             icon: AtomIcon,       href: '/hermes',           status: 'online' },
  { id: 'git',      name: 'Git Manager',  desc: 'Repositories & commits',   icon: GitBranchIcon,  href: '/git',              status: 'online' },
  { id: 'vercel',   name: 'Vercel',       desc: 'Deployments & hosting',    icon: CloudIcon,      href: '/vercel',           status: 'online' },
  { id: 'supabase', name: 'Supabase',     desc: 'Backend & database',       icon: DatabaseIcon,   href: '/agent?app=supabase', status: 'online' },
  { id: 'video',    name: 'Video Agent',  desc: 'AI YouTube Shorts',        icon: VideoIcon,      href: '/video',            status: 'online' },
  { id: 'hyperdrive', name: 'Hyper Drive', desc: 'Media library',            icon: LayersIcon,     href: '/hyperdrive', status: 'online' },
]

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
        <span key={i} className="w-[3px] rounded-sm bg-cyan-300/35 group-hover:bg-cyan-300/65 transition-colors"
          style={{ height: `${h * 100}%`, animation: `eq-bar ${1.4 + (i % 3) * 0.25}s ease-in-out ${i * 0.1}s infinite`, transformOrigin: 'bottom' }} />
      ))}
    </div>
  )
}

/* ── HUD side panel ─────────────────────────────────────────────── */
type HudPanelProps = {
  app: AppDef; index: number; side: 'left' | 'right'
  onLaunch: (a: AppDef) => void
}

const HudPanel = forwardRef<HTMLButtonElement, HudPanelProps>(function HudPanel(
  { app, index, side, onLaunch }, ref
) {
  const Icon = app.icon
  const num  = String(index + 1).padStart(2, '0')
  const disabled = app.status !== 'online'

  const iconBox = (
    <span className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 bg-white/[0.02] flex-shrink-0 transition-all duration-300 group-hover:border-cyan-400/35 group-hover:bg-cyan-400/[0.05]">
      <Icon className={`w-[18px] h-[18px] transition-colors duration-300 ${disabled ? 'text-slate-600' : 'text-slate-400 group-hover:text-white'}`} strokeWidth={1.5} />
      {app.status === 'online' && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
      )}
      {app.status === 'locked' && (
        <LockIcon className="absolute top-1.5 right-1.5 w-3 h-3 text-slate-600" strokeWidth={1.5} />
      )}
    </span>
  )

  const body = (
    <div className={`flex flex-col gap-1 min-w-0 ${side === 'right' ? 'items-end text-right' : ''}`}>
      <div className={`flex items-baseline gap-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-sm font-mono font-light text-white/20 tabular-nums leading-none">{num}</span>
        <span className="text-[13px] font-mono tracking-wide text-slate-300 group-hover:text-white transition-colors truncate">{app.name}</span>
      </div>
      <span className="text-[10px] font-mono text-slate-600 truncate">{app.desc}</span>
      <MiniGraph data={GRAPHS[index % GRAPHS.length]} align={side === 'right' ? 'right' : 'left'} />
    </div>
  )

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => onLaunch(app)}
      className={`hud-panel hud-panel-${side} group relative w-[210px] px-3.5 py-3 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`flex items-center gap-3 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        {iconBox}
        {body}
      </div>
    </button>
  )
})

/* ── SVG wire overlay ───────────────────────────────────────────── */
type WirePath = { d: string; elbow: [number, number]; id: number; delay: number }

function WireOverlay({
  panelRefs,
  coreRef,
  ready,
}: {
  panelRefs: React.RefObject<Array<HTMLButtonElement | null>>
  coreRef:   React.RefObject<HTMLDivElement | null>
  ready:     boolean
}) {
  const [wires, setWires] = useState<WirePath[]>([])

  useEffect(() => {
    if (!ready) return

    function measure() {
      if (window.innerWidth < 1024) { setWires([]); return }
      const coreEl = coreRef.current
      if (!coreEl) return

      const cr   = coreEl.getBoundingClientRect()
      const cCX  = cr.left + cr.width  / 2
      const cCY  = cr.top  + cr.height / 2
      // outermost ring: r=115 of 240-unit viewBox, div width=cr.width
      const outerR = (115 / 120) * (cr.width / 2)

      const paths = (panelRefs.current ?? []).map((el, i) => {
        if (!el) return null
        const pr = el.getBoundingClientRect()
        if (pr.width === 0) return null               // hidden
        const isLeft = i < 3
        const px = isLeft ? pr.right  : pr.left
        const py = pr.top + pr.height / 2

        // ring connection angle → point
        const angle = Math.atan2(py - cCY, px - cCX)
        const rx = cCX + outerR * Math.cos(angle)
        const ry = cCY + outerR * Math.sin(angle)

        // elbow: horizontal end, just outside the ring
        const elbowX = isLeft ? cCX - outerR * 1.06 : cCX + outerR * 1.06
        const elbow: [number, number] = [elbowX, py]

        // L-path: long horizontal → short diagonal into ring
        const d = `M${px},${py} L${elbowX},${py} L${rx},${ry}`
        return { d, elbow, id: i, delay: i * 0.14 } as WirePath
      }).filter(Boolean) as WirePath[]

      setWires(paths)
    }

    // measure after next paint so layout is settled
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure) }
  }, [ready, panelRefs, coreRef])

  if (wires.length === 0) return null

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 16 }}
      aria-hidden="true"
    >
      {wires.map(({ d, elbow, id, delay }) => (
        <g key={id}>
          {/* soft glow behind the wire */}
          <path d={d} stroke="rgba(0,210,255,0.12)" strokeWidth="4" fill="none"
            style={{ strokeDasharray: 1200, strokeDashoffset: 1200,
                     animation: `draw-hud-wire 1.1s ease ${delay}s forwards` }} />

          {/* sharp wire */}
          <path d={d} stroke="rgba(0,200,255,0.45)" strokeWidth="1" fill="none"
            style={{ strokeDasharray: 1200, strokeDashoffset: 1200,
                     animation: `draw-hud-wire 1.1s ease ${delay + 0.04}s forwards` }} />

          {/* elbow joint dot */}
          <circle cx={elbow[0]} cy={elbow[1]} r="2.5"
            fill="rgba(0,210,255,0.55)"
            style={{ filter: 'drop-shadow(0 0 3px rgba(0,220,255,0.8))',
                     opacity: 0,
                     animation: `fade-in 0.3s ease ${delay + 0.9}s forwards` }} />

          {/* data-packet dot traveling the wire */}
          <circle r="2" fill="#67e8f9"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,220,255,0.95))',
                     opacity: 0,
                     animation: `fade-in 0.1s ease ${delay + 1.2}s forwards` }}>
            <animateMotion
              dur={`${3 + id * 0.4}s`}
              begin={`${delay + 1.2}s`}
              repeatCount="indefinite"
              path={d}
            />
          </circle>
        </g>
      ))}
    </svg>
  )
}

/* ── corner HUD frame ───────────────────────────────────────────── */
function HudFrame() {
  const sz = 'w-9 h-9'
  const b  = 'border-cyan-400/20'
  /* small extra tick beside each corner */
  return (
    <>
      {/* corners */}
      <div className={`fixed top-11 left-3 ${sz} border-t border-l ${b} pointer-events-none`} style={{ zIndex: 28 }} />
      <div className={`fixed top-11 right-3 ${sz} border-t border-r ${b} pointer-events-none`} style={{ zIndex: 28 }} />
      <div className={`fixed bottom-3 left-3 ${sz} border-b border-l ${b} pointer-events-none`} style={{ zIndex: 28 }} />
      <div className={`fixed bottom-3 right-3 ${sz} border-b border-r ${b} pointer-events-none`} style={{ zIndex: 28 }} />
      {/* corner accent dots */}
      <div className="fixed top-11 left-3 w-1 h-1 bg-cyan-400/50 rounded-full shadow-[0_0_6px_rgba(0,220,255,0.7)] pointer-events-none" style={{ zIndex: 28 }} />
      <div className="fixed top-11 right-3 w-1 h-1 bg-cyan-400/50 rounded-full shadow-[0_0_6px_rgba(0,220,255,0.7)] pointer-events-none" style={{ zIndex: 28 }} />
      <div className="fixed bottom-3 left-3 w-1 h-1 bg-cyan-400/50 rounded-full shadow-[0_0_6px_rgba(0,220,255,0.7)] pointer-events-none" style={{ zIndex: 28 }} />
      <div className="fixed bottom-3 right-3 w-1 h-1 bg-cyan-400/50 rounded-full shadow-[0_0_6px_rgba(0,220,255,0.7)] pointer-events-none" style={{ zIndex: 28 }} />
      {/* thin top / bottom HUD rule lines */}
      <div className="fixed top-11 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent pointer-events-none" style={{ zIndex: 28 }} />
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent pointer-events-none" style={{ zIndex: 28 }} />
    </>
  )
}

/* ── dock icon (mobile) ─────────────────────────────────────────── */
function AppIcon({ app, onLaunch }: { app: AppDef; onLaunch: (a: AppDef) => void }) {
  const Icon = app.icon
  const disabled = app.status !== 'online'
  return (
    <button type="button" disabled={disabled} onClick={() => onLaunch(app)}
      className={`group relative flex flex-col items-center gap-2 w-[78px] ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className="relative flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/[0.06]">
        <Icon className={`w-[22px] h-[22px] ${disabled ? 'text-slate-500' : 'text-slate-300 group-hover:text-white'}`} strokeWidth={1.5} />
        {app.status === 'online' && (
          <span className="absolute top-2 right-2 w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
        )}
        {app.status === 'soon' && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-mono tracking-[0.15em] px-1.5 py-px rounded bg-white/5 border border-white/10 text-slate-500">SOON</span>
        )}
      </span>
      <span className="text-[10.5px] font-mono tracking-wide text-slate-400 group-hover:text-slate-200 transition-colors text-center">{app.name}</span>
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
          <div className="flex flex-col items-center gap-3 opacity-40">
            <BrainCircuitIcon className="w-9 h-9 text-slate-300" strokeWidth={1.25} />
            <span className="text-[11px] font-mono tracking-[0.35em] text-slate-500">HELIX&nbsp;OS</span>
          </div>
        </div>
        <div className="launch-face launch-face-right">
          <div className="flex flex-col items-center gap-6">
            <span className="relative flex items-center justify-center w-24 h-24 rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_0_60px_-10px_rgba(0,200,255,0.4)]"
              style={{ animation: 'launch-icon-pop 850ms cubic-bezier(.34,1.56,.64,1) forwards' }}>
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

/* ── main component ─────────────────────────────────────────────── */
export function Landing() {
  const router = useRouter()
  const clock  = useClock()
  const cpu    = useMeter(34, 30)
  const mem    = useMeter(58, 18)
  const net    = useMeter(12, 24)

  const [booting,   setBooting]   = useState(true)
  const [bootLine,  setBootLine]  = useState(0)
  const [launching, setLaunching] = useState<AppDef | null>(null)
  const [wireReady, setWireReady] = useState(false)

  // refs for SVG wire overlay
  const panelRefs = useRef<Array<HTMLButtonElement | null>>(Array(6).fill(null))
  const coreRef   = useRef<HTMLDivElement | null>(null)
  // true only on the very first command-centre load this session
  const freshBoot = useRef(false)

  const bootLines = [
    'INITIALISING HELIX KERNEL...',
    'LOADING NEURAL CORE...',
    'MOUNTING AI MODULES...',
    'ESTABLISHING SECURE LINK...',
    'COMMAND CENTRE ONLINE.',
  ]

  // Decide before paint: skip the boot sequence when returning from an
  // in-app page (the boot only plays once per browser session).
  useLayoutEffect(() => {
    if (sessionStorage.getItem('helix-booted')) {
      setBooting(false)
      requestAnimationFrame(() => setWireReady(true))
    } else {
      freshBoot.current = true
    }
  }, [])

  useEffect(() => {
    if (!freshBoot.current) return
    if (bootLine < bootLines.length) {
      const t = setTimeout(() => setBootLine((l) => l + 1), 360)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      sessionStorage.setItem('helix-booted', '1')
      setBooting(false)
      // give layout one frame to paint before measuring
      requestAnimationFrame(() => setWireReady(true))
    }, 500)
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

  const half      = Math.ceil(apps.length / 2)
  const leftApps  = apps.slice(0, half)
  const rightApps = apps.slice(half)

  /* ── boot overlay ──────────────────────────────────────────────── */
  if (booting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/50 backdrop-blur-md font-mono">
        <BrainCircuitIcon className="w-9 h-9 text-white/90 animate-pulse drop-shadow-[0_0_14px_rgba(0,200,255,0.6)]" strokeWidth={1.1} />
        <div className="flex flex-col gap-1.5 text-[11px] tracking-[0.15em] text-slate-400 w-[290px]">
          {bootLines.slice(0, bootLine).map((l, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-cyan-300/80">›</span>{l}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-screen max-h-screen overflow-hidden select-none">
      {launching && <LaunchTransition app={launching} />}

      {/* SVG wire overlay — full viewport, reads real DOM positions */}
      <WireOverlay panelRefs={panelRefs} coreRef={coreRef} ready={wireReady} />

      {/* corner HUD frame */}
      <HudFrame />

      {/* ── TOP STATUS BAR ─────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2 text-xs font-mono border-b border-white/8 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold tracking-[0.2em] holo-title">
            <BrainCircuitIcon className="w-4 h-4 text-cyan-300" strokeWidth={1.5} />
            HELIX&nbsp;OS
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-500 tracking-wider">Command Centre</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-5 text-slate-500">
          <span className="hidden sm:flex items-center gap-1.5">
            <CpuIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="tabular-nums">{cpu}%</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <CircleIcon className="w-3 h-3" strokeWidth={1.5} />
            <span className="tabular-nums">MEM {mem}%</span>
          </span>
          <span className="hidden md:flex items-center gap-1.5">
            <WifiIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="tabular-nums">{net} Mb/s</span>
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
            <span className="tabular-nums tracking-wide">{time}</span>
          </span>
        </div>
      </header>

      {/* ── DESKTOP / HUD ──────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 grid place-items-center min-h-0 overflow-hidden">
        {/* greeting */}
        <div className="absolute top-5 left-6 sm:top-8 sm:left-10 text-left pointer-events-none z-20">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-slate-600">{date}</p>
          <p className="text-xl sm:text-[28px] font-mono font-light text-white/80 mt-2 tracking-tight">Good to see you.</p>
          <p className="text-xs sm:text-sm font-mono text-slate-500 mt-1">How can I help you build today?</p>
        </div>

        {/* left HUD panels */}
        <div className="hidden lg:flex flex-col gap-4 absolute left-6 xl:left-10 top-1/2 -translate-y-1/2 z-20">
          {leftApps.map((app, i) => (
            <HudPanel
              key={app.id}
              ref={(el) => { panelRefs.current[i] = el }}
              app={app} index={i} side="left" onLaunch={launch}
            />
          ))}
        </div>

        {/* right HUD panels */}
        <div className="hidden lg:flex flex-col gap-4 absolute right-6 xl:right-10 top-1/2 -translate-y-1/2 z-20">
          {rightApps.map((app, i) => (
            <HudPanel
              key={app.id}
              ref={(el) => { panelRefs.current[i + half] = el }}
              app={app} index={i + half} side="right" onLaunch={launch}
            />
          ))}
        </div>

        {/* reactor core */}
        <div className="flex flex-col items-center z-20">
          <ReactorCore divRef={coreRef} />
          <div className="mt-1 flex items-center gap-2.5 text-[10px] font-mono tracking-[0.3em] text-slate-500">
            <span className="w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_6px_rgba(0,220,255,0.9)]" />
            HELIX&nbsp;ASSISTANT — STANDING&nbsp;BY
          </div>
        </div>
      </main>

      {/* ── MOBILE DOCK ────────────────────────────────────────────── */}
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
