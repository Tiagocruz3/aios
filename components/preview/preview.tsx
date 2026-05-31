'use client'

import { BarLoader } from 'react-spinners'
import { CompassIcon, RefreshCwIcon } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/panels/panels'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  disabled?: boolean
  url?: string
}

export function Preview({ className, disabled, url }: Props) {
  const [currentUrl, setCurrentUrl] = useState(url)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState(url || '')
  const [isLoading, setIsLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setCurrentUrl(url)
    setInputValue(url || '')
  }, [url])

  const refreshIframe = () => {
    if (iframeRef.current && currentUrl) {
      setIsLoading(true)
      setError(null)
      iframeRef.current.src = ''
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = currentUrl
      }, 10)
    }
  }

  const loadNewUrl = () => {
    if (iframeRef.current && inputValue) {
      if (inputValue !== currentUrl) {
        setIsLoading(true)
        setError(null)
        iframeRef.current.src = inputValue
      } else {
        refreshIframe()
      }
    }
  }

  return (
    <Panel className={className}>
      <PanelHeader>
        <div className="absolute flex items-center space-x-1">
          <a href={currentUrl} target="_blank" className="cursor-pointer px-1 text-cyan-600 hover:text-cyan-400 transition-colors">
            <CompassIcon className="w-4" />
          </a>
          <button
            onClick={refreshIframe}
            type="button"
            className={cn('cursor-pointer px-1 text-cyan-600 hover:text-cyan-400 transition-colors', {
              'animate-spin': isLoading,
            })}
          >
            <RefreshCwIcon className="w-4" />
          </button>
        </div>

        <div className="m-auto h-6">
          {url && (
            <input
              type="text"
              className="font-mono text-xs h-6 border border-cyan-500/20 px-4 bg-black/40 text-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/40 min-w-[300px] placeholder:text-slate-600"
              onChange={(event) => setInputValue(event.target.value)}
              onClick={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                  loadNewUrl()
                }
              }}
              value={inputValue}
            />
          )}
        </div>
      </PanelHeader>

      <div className="flex-1 relative overflow-hidden">
        {currentUrl && !disabled && (
          <>
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="absolute inset-0 w-full h-full border-0"
              onLoad={() => { setIsLoading(false); setError(null) }}
              onError={() => { setIsLoading(false); setError('Failed to load') }}
              title="Preview"
            />

            {isLoading && !error && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center flex-col gap-3 z-10">
                <BarLoader color="#00ccff" width={120} />
                <span className="text-cyan-500/70 text-xs font-mono">Loading preview…</span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-3 z-10">
                <span className="text-red-400 font-mono text-sm">Failed to load page</span>
                <button
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-mono border border-cyan-500/20 px-3 py-1 rounded hover:bg-cyan-500/10 transition-all"
                  type="button"
                  onClick={() => {
                    if (currentUrl) {
                      setIsLoading(true)
                      setError(null)
                      const newUrl = new URL(currentUrl)
                      newUrl.searchParams.set('t', Date.now().toString())
                      setCurrentUrl(newUrl.toString())
                    }
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </>
        )}

        {(!currentUrl || disabled) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-600 font-mono text-xs uppercase tracking-widest">
              No preview available
            </span>
          </div>
        )}
      </div>
    </Panel>
  )
}
