import { LayersIcon } from 'lucide-react'
import { DedicatedShell } from '@/components/layout/dedicated-shell'
import { HyperDrive } from '@/components/hyperdrive/hyperdrive'

export default function HyperDrivePage() {
  return (
    <DedicatedShell
      title="Hyper Drive"
      icon={<LayersIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />}
    >
      <HyperDrive />
    </DedicatedShell>
  )
}
