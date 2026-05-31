'use client'

import { VercelManager } from '@/components/vercel-manager/vercel-manager'
import { DedicatedShell } from '@/components/layout/dedicated-shell'
import { TriangleIcon } from 'lucide-react'

export default function VercelPage() {
  return (
    <DedicatedShell
      title="Vercel Manager"
      icon={<TriangleIcon className="w-3.5 h-3.5 text-cyan-300" strokeWidth={1.5} />}
    >
      <VercelManager />
    </DedicatedShell>
  )
}
