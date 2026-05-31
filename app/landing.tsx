'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  DnaIcon,
  ZapIcon,
  GitBranchIcon,
  CloudIcon,
  DatabaseIcon,
  ArrowRightIcon,
  ActivityIcon,
  CpuIcon,
  GlobeIcon,
  ShieldIcon,
} from 'lucide-react'

function useTypewriter(lines: string[], speed = 45, pause = 1800) {
  const [displayText, setDisplayText] = useState('')
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = lines[lineIdx]
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          setDisplayText(current.slice(0, charIdx + 1))
          if (charIdx + 1 === current.length) {
            setTimeout(() => setDeleting(true), pause)
          } else {
            setCharIdx((c) => c + 1)
          }
        } else {
          setDisplayText(current.slice(0, charIdx - 1))
          if (charIdx - 1 === 0) {
            setDeleting(false)
            setLineIdx((i) => (i + 1) % lines.length)
            setCharIdx(0)
          } else {
            setCharIdx((c) => c - 1)
          }
        }
      },
      deleting ? speed / 2 : speed
    )
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, lineIdx, lines, speed, pause])

  return displayText
}

const modules = [
  {
    icon: ZapIcon,
    label: 'AI Code Agent',
    desc: 'Generate full-stack apps from natural language prompts.',
    color: 'cyan',
    glow: 'shadow-[0_0_20px_rgba(0,200,255,0.25)]',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/5',
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-300',
    tag: 'ACTIVE',
    tagColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    icon: GitBranchIcon,
    label: 'Git Manager',
    desc: 'Browse, edit, and commit code across all your repositories.',
    color: 'purple',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-300',
    tag: 'ONLINE',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    icon: CloudIcon,
    label: 'Vercel Manager',
    desc: 'Deploy and manage projects directly from the command centre.',
    color: 'slate',
    glow: 'shadow-[0_0_20px_rgba(148,163,184,0.15)]',
    border: 'border-slate-500/30',
    bg: 'bg-slate-500/5',
    iconBg: 'bg-slate-500/15',
    iconColor: 'text-slate-300',
    tag: 'LINKED',
    tagColor: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  },
  {
    icon: DatabaseIcon,
    label: 'Supabase',
    desc: 'Spin up databases, run SQL, and manage API keys in realtime.',
    color: 'emerald',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-300',
    tag: 'READY',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
]

const stats = [
  { label: 'Neural Models', value: '12', icon: CpuIcon },
  { label: 'Integrations', value: '4', icon: GlobeIcon },
  { label: 'Uptime', value: '99.9%', icon: ActivityIcon },
  { label: 'Encrypted', value: 'E2E', icon: ShieldIcon },
]

function HudRing({
  size,
  duration,
  reverse,
  opacity,
}: {
  size: number
  duration: number
  reverse?: boolean
  opacity?: number
}) {
  return (
    <div
      className="absolute rounded-full border border-cyan-400/20"
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: `spin ${duration}s linear infinite ${reverse ? 'reverse' : ''}`,
        opacity: opacity ?? 0.4,
      }}
    >
      <div
        className="absolute w-2 h-2 rounded-full bg-cyan-400"
        style={{ top: -4, left: '50%', transform: 'translateX(-50%)', filter: 'blur(1px)' }}
      />
    </div>
  )
}

export function Landing() {
  const typeText = useTypewriter([
    'Build full-stack applications.',
    'Deploy in seconds.',
    'Manage your entire stack.',
    'From idea to production.',
  ])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* ── Animated HUD rings centred behind hero ─────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
        style={{ zIndex: 0 }}
      >
        {mounted && (
          <>
            <HudRing size={340} duration={18} opacity={0.18} />
            <HudRing size={500} duration={28} reverse opacity={0.12} />
            <HudRing size={680} duration={40} opacity={0.08} />
            <HudRing size={860} duration={55} reverse opacity={0.05} />
            {/* Radial glow */}
            <div
              className="absolute rounded-full"
              style={{
                width: 600,
                height: 600,
                background:
                  'radial-gradient(circle, rgba(0,200,255,0.07) 0%, transparent 70%)',
              }}
            />
          </>
        )}
      </div>

      {/* ── Scan line ────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" style={{ zIndex: 0 }}>
        <div className="landing-scan-line" />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 shadow-[0_0_14px_rgba(0,200,255,0.25)]">
            <DnaIcon className="w-4 h-4 text-cyan-300" />
          </span>
          <span className="text-base font-mono font-bold tracking-[0.28em] holo-title">
            HELIX
          </span>
          <span className="holo-pulse-dot" />
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/tiagocruz3/aios"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-slate-400 border border-cyan-500/15 bg-black/30 hover:text-cyan-200 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
          >
            GitHub
          </a>
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-500/60 transition-all shadow-[0_0_12px_rgba(0,200,255,0.15)]"
          >
            Launch Agent
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pt-8 pb-16 text-center">
        {/* System badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-cyan-500/25 bg-cyan-500/5 backdrop-blur-sm text-xs font-mono text-cyan-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          HELIX COMMAND CENTRE — SYSTEM ONLINE
        </div>

        {/* Main title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-mono font-black tracking-tight mb-4">
          <span className="holo-title">AI Command</span>
          <br />
          <span className="text-white/90">Centre</span>
        </h1>

        {/* Typewriter */}
        <p className="mt-4 text-base sm:text-lg font-mono text-slate-400 h-7 flex items-center gap-1">
          {typeText}
          <span className="inline-block w-0.5 h-5 bg-cyan-400 animate-pulse ml-0.5" />
        </p>

        {/* Description */}
        <p className="mt-6 max-w-lg text-sm text-slate-500 leading-relaxed">
          Helix is your autonomous AI engineering platform. Generate, deploy, and manage your entire
          full-stack product — all from a single intelligent command centre.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/agent"
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-mono font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-all shadow-[0_0_30px_rgba(0,200,255,0.45)] hover:shadow-[0_0_45px_rgba(0,200,255,0.65)]"
          >
            <ZapIcon className="w-4 h-4" />
            Open Helix Code Agent
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="https://github.com/tiagocruz3/aios"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-mono text-slate-400 border border-slate-600/40 hover:text-slate-200 hover:border-slate-500/60 transition-all"
          >
            View Source
          </a>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-cyan-500/10 bg-black/20 backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 max-w-3xl mx-auto">
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1 px-6 py-5 border-r border-cyan-500/10 last:border-r-0"
              >
                <Icon className="w-4 h-4 text-cyan-400/60 mb-0.5" />
                <span className="text-xl font-mono font-black text-cyan-300">{s.value}</span>
                <span className="text-xs font-mono text-slate-500">{s.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Module cards ──────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 md:px-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-mono text-slate-600 tracking-[0.2em] mb-8 uppercase">
            Integrated Systems
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m) => {
              const Icon = m.icon
              return (
                <Link
                  key={m.label}
                  href="/agent"
                  className={`group flex flex-col gap-3 p-4 rounded-xl border ${m.border} ${m.bg} ${m.glow} backdrop-blur-sm hover:scale-[1.025] hover:brightness-110 transition-all duration-200 cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${m.iconBg}`}>
                      <Icon className={`w-4.5 h-4.5 ${m.iconColor}`} />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${m.tagColor}`}>
                      {m.tag}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-mono font-semibold text-white/80 mb-1">{m.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono text-slate-600 group-hover:text-slate-400 transition-colors mt-auto">
                    Open <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-cyan-500/10 py-6 text-center text-xs font-mono text-slate-600">
        HELIX © {new Date().getFullYear()} — AI Command Centre
      </footer>
    </div>
  )
}
