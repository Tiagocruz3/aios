'use client'

import { GitManager } from '@/components/git-manager/git-manager'
import { DedicatedShell } from '@/components/layout/dedicated-shell'
import { GithubIcon } from 'lucide-react'

export default function GitPage() {
  return (
    <DedicatedShell
      title="Git Manager"
      icon={<GithubIcon className="w-4 h-4 text-cyan-300" strokeWidth={1.5} />}
    >
      <GitManager />
    </DedicatedShell>
  )
}
