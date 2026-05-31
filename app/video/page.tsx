'use client'

import { VideoAgent } from '@/components/video-agent/video-agent'
import { DedicatedShell } from '@/components/layout/dedicated-shell'
import { VideoIcon } from 'lucide-react'

export default function VideoPage() {
  return (
    <DedicatedShell
      title="Video Agent"
      icon={<VideoIcon className="w-4 h-4 text-cyan-300" strokeWidth={1.5} />}
    >
      <VideoAgent />
    </DedicatedShell>
  )
}
