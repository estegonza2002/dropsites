'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface WorkspaceDefaultsData {
  expiryDays: number | null
  allowIndexing: boolean
  passwordRequired: boolean
}

interface DefaultSettingsProps {
  workspaceId: string
  initialDefaults?: WorkspaceDefaultsData
  onSaved?: () => void
}

export function DefaultSettings({
  workspaceId,
  initialDefaults,
  onSaved,
}: DefaultSettingsProps) {
  const [expiryDays, setExpiryDays] = useState<string>(
    initialDefaults?.expiryDays?.toString() ?? '',
  )
  const [allowIndexing, setAllowIndexing] = useState(
    initialDefaults?.allowIndexing ?? true,
  )
  const [passwordRequired, setPasswordRequired] = useState(
    initialDefaults?.passwordRequired ?? false,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Sync when initialDefaults change
  useEffect(() => {
    if (initialDefaults) {
      setExpiryDays(initialDefaults.expiryDays?.toString() ?? '')
      setAllowIndexing(initialDefaults.allowIndexing)
      setPasswordRequired(initialDefaults.passwordRequired)
    }
  }, [initialDefaults])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    const parsedExpiry = expiryDays.trim() ? parseInt(expiryDays, 10) : null
    if (parsedExpiry !== null && (isNaN(parsedExpiry) || parsedExpiry < 1 || parsedExpiry > 365)) {
      setError('Expiry must be between 1 and 365 days, or empty for no expiry')
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_deployment_settings: {
            expiry_days: parsedExpiry,
            allow_indexing: allowIndexing,
            password_required: passwordRequired,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message ?? 'Failed to save defaults')
        return
      }

      setSuccess(true)
      onSaved?.()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="default-expiry" className="text-sm font-medium">
          Default expiry (days)
        </Label>
        <Input
          id="default-expiry"
          type="number"
          min={1}
          max={365}
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
          placeholder="No expiry"
          className="h-8 text-sm max-w-[160px]"
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          New deployments will expire after this many days. Leave empty for no default expiry.
        </p>
      </div>

      <div className="flex items-center justify-between max-w-sm">
        <div className="space-y-0.5">
          <Label htmlFor="default-indexing" className="text-sm font-medium">
            Allow search indexing
          </Label>
          <p className="text-xs text-muted-foreground">
            Let search engines discover new deployments by default.
          </p>
        </div>
        <Switch
          id="default-indexing"
          checked={allowIndexing}
          onCheckedChange={setAllowIndexing}
          disabled={saving}
        />
      </div>

      <div className="flex items-center justify-between max-w-sm">
        <div className="space-y-0.5">
          <Label htmlFor="default-password" className="text-sm font-medium">
            Require password
          </Label>
          <p className="text-xs text-muted-foreground">
            Require a password on all new deployments by default.
          </p>
        </div>
        <Switch
          id="default-password"
          checked={passwordRequired}
          onCheckedChange={setPasswordRequired}
          disabled={saving}
        />
      </div>

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {success && <p className="text-xs text-[var(--color-success)]">Defaults saved.</p>}

      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Saving\u2026' : 'Save defaults'}
      </Button>
    </form>
  )
}
