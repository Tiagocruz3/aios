import { RadioIcon } from 'lucide-react'
import { DedicatedShell } from '@/components/layout/dedicated-shell'
import { HermesChat } from '@/components/hermes-chat/hermes-chat'

export default function HermesPage() {
  return (
    <DedicatedShell
      title="Phantom Chat"
      icon={<RadioIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />}
    >
      <HermesChat />
    </DedicatedShell>
  )
}
