'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SettingsIcon, Loader2Icon, CheckIcon, ShieldCheckIcon } from 'lucide-react'
import {
  PHANTOM_PROVIDERS,
  PROVIDER_LABELS,
  type ProviderId,
} from '@/lib/phantom-chat/types'
import { usePhantomSettings } from './use-phantom-settings'

/**
 * Settings → Phantom Chat Settings → OpenClaw Settings.
 *
 * The token field is write-only: we display whether a token is configured but
 * never its value (the server never sends it). Submitting an empty token field
 * leaves the existing token untouched.
 */
export function PhantomSettings({
  onProviderChange,
}: {
  onProviderChange?: (provider: ProviderId) => void
}) {
  const { settings, isLoading, save } = usePhantomSettings()
  const [open, setOpen] = useState(false)

  const [provider, setProvider] = useState<ProviderId>('openclaw')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [userIdKey, setUserIdKey] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate the form whenever the dialog opens with fresh settings.
  useEffect(() => {
    if (open && settings) {
      setProvider(settings.provider)
      setBaseUrl(settings.openclawBaseUrl)
      setModel(settings.openclawModel)
      setUserIdKey(settings.stableUserIdKey)
      setToken('')
      setError(null)
      setSaved(false)
    }
  }, [open, settings])

  const tokenStatus = useMemo(() => {
    if (!settings) return null
    if (settings.hasOpenclawToken) {
      return settings.openclawTokenFromSettings
        ? 'A token is saved (encrypted).'
        : 'Using token from environment default.'
    }
    return 'No token configured yet.'
  }, [settings])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const next = await save({
        provider,
        openclawBaseUrl: baseUrl,
        openclawModel: model,
        stableUserIdKey: userIdKey,
        // Only send the token field when the user typed something.
        ...(token.trim() ? { openclawToken: token.trim() } : {}),
      })
      onProviderChange?.(next.provider)
      setToken('')
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Phantom Chat Settings"
          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 border border-white/10 bg-white/[0.03] hover:text-cyan-200 hover:border-cyan-400/30 transition-all"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phantom Chat Settings</DialogTitle>
          <DialogDescription>
            Configure the chat backend. The gateway token is stored encrypted on
            the server and never exposed to the browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Chat Method / Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as ProviderId)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHANTOM_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-white/8 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider">
                OpenClaw Settings
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oc-base-url">Gateway Base URL</Label>
              <Input
                id="oc-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-gateway.example.com"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oc-token">Gateway Token (secret)</Label>
              <Input
                id="oc-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={
                  settings?.hasOpenclawToken
                    ? '•••••••• (leave blank to keep)'
                    : 'Paste gateway token'
                }
                autoComplete="off"
                spellCheck={false}
              />
              {tokenStatus && (
                <p className="text-[10px] font-mono text-slate-500">{tokenStatus}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="oc-model">Model</Label>
              <Input
                id="oc-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="openclaw/default"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oc-user-key">Stable User ID key</Label>
              <Input
                id="oc-user-key"
                value={userIdKey}
                onChange={(e) => setUserIdKey(e.target.value)}
                placeholder="webui:<appUserId>"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[10px] font-mono text-slate-500">
                <code>&lt;appUserId&gt;</code> is replaced with your app user id.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs font-mono text-red-400 break-words">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            {saved && !saving && (
              <span className="flex items-center gap-1 text-xs font-mono text-emerald-400">
                <CheckIcon className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <Button onClick={handleSave} disabled={saving || isLoading} size="sm">
              {saving ? (
                <>
                  <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> Saving
                </>
              ) : (
                'Save settings'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
