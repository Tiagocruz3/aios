import { CalendarIcon } from 'lucide-react'
import { DedicatedShell } from '@/components/layout/dedicated-shell'
import { HelixCalendar } from '@/components/calendar/helix-calendar'

export default function CalendarPage() {
  return (
    <DedicatedShell
      title="Calendar"
      icon={<CalendarIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />}
    >
      <HelixCalendar />
    </DedicatedShell>
  )
}
