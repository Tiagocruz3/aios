import { ToggleWelcome } from '@/components/modals/welcome'
import { VercelDashed } from '@/components/icons/vercel-dashed'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export async function Header({ className }: Props) {
  return (
    <header className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        <VercelDashed className="ml-1 md:ml-2.5 mr-0.5 opacity-80" />
        <span className="hidden md:inline text-sm uppercase font-mono font-bold tracking-tight holo-title">
          OSS Vibe Coding Platform
        </span>
        <span className="holo-pulse-dot" />
      </div>
      <div className="flex items-center ml-auto space-x-1.5">
        <ToggleWelcome />
      </div>
    </header>
  )
}
