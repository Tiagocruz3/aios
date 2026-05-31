import { Chat } from './chat'
import { Header } from './header'
import { Horizontal } from '@/components/layout/panels'
import { RightPanel } from '@/components/layout/right-panel'
import { Welcome } from '@/components/modals/welcome'
import { cookies } from 'next/headers'
import { getHorizontal } from '@/components/layout/sizing'
import { hideBanner } from '@/app/actions'

export default async function Page() {
  const store = await cookies()
  const banner = store.get('banner-hidden')?.value !== 'true'
  const horizontalSizes = getHorizontal(store)
  return (
    <>
      <Welcome defaultOpen={banner} onDismissAction={hideBanner} />
      <div className="flex flex-col h-screen max-h-screen overflow-hidden px-2 pb-2 pt-1 gap-1">
        <Header className="flex items-center w-full flex-shrink-0" />

        {/* Mobile layout — chat on top, tabbed panel below */}
        <div className="flex flex-col flex-1 w-full min-h-0 overflow-hidden gap-1.5 md:hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <Chat className="h-full overflow-hidden" />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <RightPanel />
          </div>
        </div>

        {/* Desktop layout — chat (32%) | tabbed right panel (68%) */}
        <div className="hidden flex-1 w-full min-h-0 overflow-hidden md:flex">
          <Horizontal
            defaultLayout={horizontalSizes ?? [32, 68]}
            left={<Chat className="flex-1 overflow-hidden" />}
            right={<RightPanel />}
          />
        </div>
      </div>
    </>
  )
}
