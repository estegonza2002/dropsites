'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Smartphone, Mail, Loader2, Check } from 'lucide-react'
import {
  PUBLISHER_NOTIFICATION_CATEGORIES,
  getDefaultPrefs,
  type NotificationPrefs,
} from '@/lib/notifications/types'

type Props = {
  initialPrefs: NotificationPrefs
  phoneVerified: boolean
}

export function NotificationPreferencesForm({ initialPrefs, phoneVerified }: Props) {
  const defaults = getDefaultPrefs()
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    // Merge saved prefs with defaults so new categories are included
    const merged = { ...defaults }
    for (const key of Object.keys(initialPrefs)) {
      if (merged[key]) {
        merged[key] = { ...merged[key], ...initialPrefs[key] }
      }
    }
    return merged
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = useCallback(
    (key: string, channel: 'email' | 'sms') => {
      setPrefs((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [channel]: !prev[key]?.[channel],
        },
      }))
      setSaved(false)
    },
    [],
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/v1/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Failed to save preferences')
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }, [prefs])

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_64px_64px] items-center gap-2 px-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Notification
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="flex items-center justify-center">
              <Mail className="size-4 text-muted-foreground" strokeWidth={1.5} />
            </TooltipTrigger>
            <TooltipContent>Email</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="flex items-center justify-center">
              <Smartphone className="size-4 text-muted-foreground" strokeWidth={1.5} />
            </TooltipTrigger>
            <TooltipContent>SMS</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator />

      {/* Notification rows */}
      {PUBLISHER_NOTIFICATION_CATEGORIES.map((cat) => {
        const pref = prefs[cat.key] ?? { email: true, sms: false }
        const hasSms = cat.channels.includes('sms')
        return (
          <div
            key={cat.key}
            className="grid grid-cols-1 sm:grid-cols-[1fr_64px_64px] items-center gap-2 px-2 py-1"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{cat.label}</p>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
            </div>

            {/* Mobile labels + toggles */}
            <div className="flex items-center gap-4 sm:contents">
              <div className="flex items-center gap-2 sm:justify-center">
                <span className="text-xs text-muted-foreground sm:hidden">Email</span>
                <Switch
                  checked={pref.email}
                  onCheckedChange={() => toggle(cat.key, 'email')}
                />
              </div>
              <div className="flex items-center gap-2 sm:justify-center">
                <span className="text-xs text-muted-foreground sm:hidden">SMS</span>
                {hasSms ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="inline-flex">
                          <Switch
                            checked={pref.sms}
                            onCheckedChange={() => toggle(cat.key, 'sms')}
                            disabled={!phoneVerified}
                          />
                        </span>
                      </TooltipTrigger>
                      {!phoneVerified && (
                        <TooltipContent>Verify your phone number to enable SMS</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="flex h-5 w-9 items-center justify-center text-xs text-muted-foreground">
                    --
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <Separator />

      {/* Save button + feedback */}
      <div className="flex items-center gap-3 px-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="size-4" strokeWidth={1.5} />
              Saved
            </>
          ) : (
            'Save preferences'
          )}
        </Button>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      </div>
    </div>
  )
}
