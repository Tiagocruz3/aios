'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SparklesIcon,
  Loader2Icon,
  DownloadIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  FilmIcon,
  WandSparklesIcon,
  ClockIcon,
  PlayIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── model + option catalogues ──────────────────────────────────── */
const MODELS = [
  { id: 'kling-1.6', name: 'Kling 1.6', hint: 'Balanced quality / speed' },
  { id: 'kling-2.1', name: 'Kling 2.1 Master', hint: 'Highest quality' },
  { id: 'ltx-video', name: 'LTX Video', hint: 'Fastest' },
  { id: 'wan-t2v', name: 'WAN T2V', hint: 'Cinematic motion' },
  { id: 'minimax', name: 'MiniMax Hailuo', hint: 'Smooth realism' },
] as const

const DURATIONS = [5, 10] as const

type JobStatus = 'idle' | 'submitting' | 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'error'

interface Clip {
  id: string
  prompt: string
  model: string
  videoUrl: string
  createdAt: number
}

const PROMPT_IDEAS = [
  'A neon cyberpunk city at night, rain-soaked streets, flying cars, cinematic',
  'Close-up of coffee being poured in slow motion, warm morning light, cozy',
  'An astronaut floating through a glowing nebula, vivid colours, dreamlike',
  'Aerial drone shot over turquoise ocean waves crashing on a tropical beach',
  'A cute robot dancing in a futuristic lab, playful, vibrant lighting',
]

export function VideoAgent({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState('')
  const [negative, setNegative] = useState('')
  const [model, setModel] = useState<string>('kling-1.6')
  const [duration, setDuration] = useState<number>(5)

  const [status, setStatus] = useState<JobStatus>('idle')
  const [queuePos, setQueuePos] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const [clips, setClips] = useState<Clip[]>([])
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // restore previous clips from this browser
  useEffect(() => {
    try {
      const saved = localStorage.getItem('helix-video-clips')
      if (saved) setClips(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    localStorage.setItem('helix-video-clips', JSON.stringify(clips.slice(0, 24)))
  }, [clips])

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    pollRef.current = null
    timerRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const busy = status === 'submitting' || status === 'IN_QUEUE' || status === 'IN_PROGRESS'

  const generate = async () => {
    if (!prompt.trim() || busy) return
    setError(null)
    setStatus('submitting')
    setQueuePos(null)
    setElapsed(0)
    setPendingPrompt(prompt.trim())

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)

    try {
      const res = await fetch('/api/video/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          duration,
          aspectRatio: '9:16',
          negativePrompt: negative.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit job')

      const { requestId, model: resolvedModel } = data
      setStatus('IN_QUEUE')

      // poll every 3s
      pollRef.current = setInterval(async () => {
        try {
          const sres = await fetch('/api/video/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: resolvedModel, requestId }),
          })
          const sdata = await sres.json()
          if (!sres.ok) throw new Error(sdata.error || 'Status check failed')

          if (sdata.status === 'COMPLETED') {
            cleanup()
            if (sdata.videoUrl) {
              setClips((c) => [
                {
                  id: requestId,
                  prompt: prompt.trim(),
                  model,
                  videoUrl: sdata.videoUrl,
                  createdAt: Date.now(),
                },
                ...c,
              ])
              setPendingPrompt(null)
              setStatus('COMPLETED')
            } else {
              setPendingPrompt(null)
              setStatus('error')
              setError('Job finished but no video URL was returned.')
            }
          } else {
            setStatus(sdata.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'IN_QUEUE')
            setQueuePos(sdata.queuePosition ?? null)
          }
        } catch (e) {
          cleanup()
          setPendingPrompt(null)
          setStatus('error')
          setError(e instanceof Error ? e.message : 'Status check failed')
        }
      }, 3000)
    } catch (e) {
      cleanup()
      setPendingPrompt(null)
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to submit job')
    }
  }

  const statusLabel = {
    submitting: 'Submitting…',
    IN_QUEUE: queuePos != null ? `Queued · #${queuePos}` : 'Queued…',
    IN_PROGRESS: 'Rendering…',
  }[status as 'submitting' | 'IN_QUEUE' | 'IN_PROGRESS']

  return (
    <div className={cn('flex h-full w-full min-h-0 bg-[#0a0f16]', className)}>
      {/* ── Left: composer ─────────────────────────────────────────── */}
      <div className="flex flex-col w-full max-w-[420px] flex-shrink-0 border-r border-white/8 min-h-0">
        <div className="flex items-center gap-2 px-4 h-11 flex-shrink-0 border-b border-white/8">
          <WandSparklesIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
            Shorts Composer
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-5">
          {/* prompt */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-wider uppercase text-slate-500">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your 30-second short…"
              rows={4}
              className="w-full resize-none font-mono text-xs p-3 bg-black/40 border border-cyan-500/15 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder:text-slate-600 leading-relaxed"
            />
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_IDEAS.map((idea, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="text-[10px] font-mono px-2 py-1 rounded-md border border-white/8 bg-white/[0.02] text-slate-500 hover:text-cyan-200 hover:border-cyan-400/30 transition-all"
                >
                  {idea.split(',')[0].slice(0, 28)}…
                </button>
              ))}
            </div>
          </div>

          {/* model */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-wider uppercase text-slate-500">
              Model
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all',
                    model === m.id
                      ? 'border-cyan-400/40 bg-cyan-400/[0.07]'
                      : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                  )}
                >
                  <span className={cn('text-xs font-mono', model === m.id ? 'text-cyan-200' : 'text-slate-300')}>
                    {m.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* duration */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-wider uppercase text-slate-500">
              Clip length (loops into a 30s short)
            </label>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'flex-1 h-8 rounded-lg border text-xs font-mono transition-all',
                    duration === d
                      ? 'border-cyan-400/40 bg-cyan-400/[0.07] text-cyan-200'
                      : 'border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/15'
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* negative */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-wider uppercase text-slate-500">
              Negative prompt <span className="text-slate-700">(optional)</span>
            </label>
            <input
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
              placeholder="blurry, low quality, watermark…"
              className="w-full font-mono text-xs h-9 px-3 bg-black/40 border border-cyan-500/15 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder:text-slate-600"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* generate button */}
        <div className="p-4 border-t border-white/8 flex-shrink-0">
          <button
            type="button"
            onClick={generate}
            disabled={!prompt.trim() || busy}
            className={cn(
              'w-full h-11 rounded-xl text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all',
              !prompt.trim() || busy
                ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_24px_-4px_rgba(0,200,255,0.6)]'
            )}
          >
            {busy ? (
              <>
                <Loader2Icon className="w-4 h-4 animate-spin" />
                {statusLabel} · {elapsed}s
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Generate Short
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Right: preview + library ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center gap-2 px-4 h-11 flex-shrink-0 border-b border-white/8">
          <FilmIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
            Render Studio
          </span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">
            {clips.length} clip{clips.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-5">
          {/* empty state — no clips and not generating */}
          {!busy && clips.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div
                className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015]"
                style={{ width: 180, aspectRatio: '9/16' }}
              >
                <PlayIcon className="w-9 h-9 text-slate-700" />
              </div>
              <p className="text-xs font-mono text-slate-500">
                Your generated Shorts will appear here.
              </p>
            </div>
          )}

          {/* clip gallery — pending card stays at top-left of grid */}
          {(busy || clips.length > 0) && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
              {busy && pendingPrompt !== null && (
                <div className="flex flex-col rounded-xl border border-cyan-400/25 bg-black/40 overflow-hidden">
                  <div
                    className="relative flex items-center justify-center bg-black overflow-hidden"
                    style={{ aspectRatio: '9/16' }}
                  >
                    <div className="absolute inset-0 video-render-shimmer" />
                    <div className="relative flex flex-col items-center gap-3 text-center px-4">
                      <Loader2Icon className="w-7 h-7 text-cyan-300 animate-spin" />
                      <p className="text-xs font-mono text-cyan-200">{statusLabel}</p>
                      <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" /> {elapsed}s
                      </p>
                    </div>
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-[10px] font-mono text-slate-500 truncate" title={pendingPrompt}>
                      {pendingPrompt}
                    </p>
                  </div>
                </div>
              )}
              {clips.map((clip) => (
                <ClipCard key={clip.id + clip.createdAt} clip={clip} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── single clip card ───────────────────────────────────────────── */
function ClipCard({ clip }: { clip: Clip }) {
  return (
    <div className="group flex flex-col rounded-xl border border-white/8 bg-white/[0.015] overflow-hidden hover:border-cyan-400/30 transition-all">
      <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={clip.videoUrl}
          controls
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex items-center gap-2 px-2.5 py-2 min-w-0">
        <p className="text-[10px] font-mono text-slate-400 truncate flex-1" title={clip.prompt}>
          {clip.prompt}
        </p>
        <a
          href={clip.videoUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          title="Download"
          className="flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:text-cyan-300 hover:bg-cyan-400/10 transition-all flex-shrink-0"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
