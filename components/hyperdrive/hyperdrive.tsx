'use client'

import { useEffect, useState } from 'react'
import {
  FilmIcon,
  ImageIcon,
  CodeIcon,
  PlayIcon,
  DownloadIcon,
  FolderOpenIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'videos' | 'images' | 'code'

interface VideoClip {
  id: string
  prompt: string
  model: string
  videoUrl: string
  createdAt: number
}

interface ImageItem {
  id: string
  prompt: string
  imageUrl: string
  model: string
  createdAt: number
}

interface CodeItem {
  id: string
  name: string
  description: string
  language: string
  createdAt: number
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'videos', label: 'Videos', icon: FilmIcon },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'code',   label: 'Code',   icon: CodeIcon  },
]

export function HyperDrive({ className }: { className?: string }) {
  const [tab, setTab] = useState<Tab>('videos')
  const [clips, setClips]   = useState<VideoClip[]>([])
  const [images, setImages] = useState<ImageItem[]>([])
  const [code, setCode]     = useState<CodeItem[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('helix-video-clips')
      if (saved) setClips(JSON.parse(saved))
    } catch { /* ignore */ }

    try {
      const saved = localStorage.getItem('helix-image-items')
      if (saved) setImages(JSON.parse(saved))
    } catch { /* ignore */ }

    try {
      const saved = localStorage.getItem('helix-code-items')
      if (saved) setCode(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const counts: Record<Tab, number> = {
    videos: clips.length,
    images: images.length,
    code:   code.length,
  }

  return (
    <div className={cn('flex flex-col h-full w-full min-h-0 holo-surface', className)}>
      {/* tab bar */}
      <div className="flex items-center gap-1 px-5 border-b border-white/8 flex-shrink-0 h-12">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all',
              tab === id
                ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/25'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {label}
            {counts[id] > 0 && (
              <span className={cn(
                'ml-1 text-[10px] rounded px-1 py-0.5',
                tab === id ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/8 text-slate-500'
              )}>
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="flex-1 min-h-0 overflow-auto p-5">
        {tab === 'videos' && <VideoGrid clips={clips} />}
        {tab === 'images' && <ImageGrid images={images} />}
        {tab === 'code'   && <CodeGrid  items={code}   />}
      </div>
    </div>
  )
}

/* ── Video grid ─────────────────────────────────────────────────── */
function VideoGrid({ clips }: { clips: VideoClip[] }) {
  if (clips.length === 0) return <EmptyState icon={FilmIcon} label="No videos yet" sub="Generate a Short in the Video Agent and it will appear here." />

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      {clips.map((clip) => (
        <div
          key={clip.id}
          className="group flex flex-col rounded-xl border border-white/8 bg-white/[0.015] overflow-hidden hover:border-cyan-400/30 transition-all"
        >
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
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-slate-400 truncate" title={clip.prompt}>
                {clip.prompt}
              </p>
              <p className="text-[9px] font-mono text-slate-600 mt-0.5">
                {new Date(clip.createdAt).toLocaleDateString()}
              </p>
            </div>
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
      ))}
    </div>
  )
}

/* ── Image grid ─────────────────────────────────────────────────── */
function ImageGrid({ images }: { images: ImageItem[] }) {
  if (images.length === 0) return <EmptyState icon={ImageIcon} label="No images yet" sub="AI-generated images from your agents will appear here." />

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {images.map((img) => (
        <div
          key={img.id}
          className="group flex flex-col rounded-xl border border-white/8 bg-white/[0.015] overflow-hidden hover:border-cyan-400/30 transition-all"
        >
          <div className="relative bg-black overflow-hidden" style={{ aspectRatio: '1/1' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={img.prompt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 min-w-0">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-slate-400 truncate" title={img.prompt}>
                {img.prompt}
              </p>
              <p className="text-[9px] font-mono text-slate-600 mt-0.5">
                {new Date(img.createdAt).toLocaleDateString()}
              </p>
            </div>
            <a
              href={img.imageUrl}
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
      ))}
    </div>
  )
}

/* ── Code grid ──────────────────────────────────────────────────── */
function CodeGrid({ items }: { items: CodeItem[] }) {
  if (items.length === 0) return <EmptyState icon={CodeIcon} label="No apps yet" sub="Apps and code generated by Helix Coder will appear here." />

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="group flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.015] p-4 hover:border-cyan-400/30 transition-all"
        >
          <div className="flex items-center gap-2">
            <FolderOpenIcon className="w-6 h-6 text-cyan-400/70 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-xs font-mono text-slate-200 truncate font-semibold">{item.name}</p>
          </div>
          <p className="text-[10px] font-mono text-slate-500 leading-relaxed line-clamp-2">
            {item.description}
          </p>
          <div className="flex items-center justify-between mt-auto pt-1">
            <span className="text-[9px] font-mono text-cyan-500/60 border border-cyan-500/20 rounded px-1.5 py-0.5 uppercase">
              {item.language}
            </span>
            <span className="text-[9px] font-mono text-slate-600">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Empty state ────────────────────────────────────────────────── */
function EmptyState({
  icon: Icon,
  label,
  sub,
}: {
  icon: React.ElementType
  label: string
  sub: string
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
        <Icon className="w-7 h-7 text-slate-700" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-mono text-slate-400 font-semibold">{label}</p>
        <p className="text-[11px] font-mono text-slate-600 mt-1 max-w-xs leading-relaxed">{sub}</p>
      </div>
    </div>
  )
}
