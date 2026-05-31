import { Chat } from './chat'
import { FileExplorer } from './file-explorer'
import { Header } from './header'
import { Horizontal } from '@/components/layout/panels'
import { Logs } from './logs'
import { Preview } from './preview'
import { RightPanel } from '@/components/layout/right-panel'
import { TabContent, TabItem } from '@/components/tabs'
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
      <div className="flex flex-col h-screen max-h-screen overflow-hidden p-2 gap-1.5">
        <Header className="flex items-center w-full flex-shrink-0" />

        {/* Mobile tab bar */}
        <ul className="mobile-tab-bar md:hidden flex-shrink-0">
          <TabItem tabId="chat">Chat</TabItem>
          <TabItem tabId="preview">Preview</TabItem>
          <TabItem tabId="file-explorer">Files</TabItem>
          <TabItem tabId="logs">Logs</TabItem>
        </ul>

        {/* Mobile layout */}
        <div className="flex flex-1 w-full overflow-hidden md:hidden">
          <TabContent tabId="chat" className="flex-1">
            <Chat className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="preview" className="flex-1">
            <Preview className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="file-explorer" className="flex-1">
            <FileExplorer className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="logs" className="flex-1">
            <Logs className="flex-1 overflow-hidden" />
          </TabContent>
        </div>

        {/* Desktop layout — chat (32%) | stacked right panel (68%) */}
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
