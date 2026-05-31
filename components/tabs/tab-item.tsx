'use client'

import type { ReactNode } from 'react'
import { useTabState } from './use-tab-state'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  tabId: string
}

export function TabItem({ children, tabId }: Props) {
  const [activeTabId, setTabId] = useTabState()
  const active = activeTabId === tabId
  return (
    <li
      onClick={() => setTabId(tabId)}
      className={cn(
        'mobile-tab-item select-none',
        active && 'active'
      )}
    >
      {children}
    </li>
  )
}
