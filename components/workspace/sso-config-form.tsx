'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SSOConfigFormProps {
  workspaceId: string
}

interface SSOData {
  enabled: boolean
  discovery_url: string
  client_id: string
  client_secret: string
  scopes: string
}

const emptySso: SSOData = {
  enabled: false,
  discovery_url: '',
  client_id: '',
  client_secret: '',
  scopes: 'openid email profile',
}

export function SSOConfigForm({ workspaceId }: SSOConfigFormProps) {
  const [sso, setSso] = useState<SSOData>(emptySso)
  const [initial, setInitial] = useState<SSOData>(emptySso)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; issuer?: string; error?: string } | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/sso`)
      const data = await res.json()
      if (res.ok && data.sso) {
        setSso(data.sso)
        setInitial(data.sso)
      }
    } catch {
      // Ignore fetch errors during load
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const hasChanges =
    sso.enabled !== initial.enabled ||
    sso.discovery_url !== initial.discovery_url ||
    sso.client_id !== initial.client_id ||
    sso.client_secret !== initial.client_secret ||
    sso.scopes !== initial.scopes

  async function handleTestConnection() {
    setTestResult(null)
    setTesting(true)

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/sso`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_connection: true, discovery_url: sso.discovery_url }),
      })
      const data = await res.json()
      if (res.ok && data.test) {
        setTestResult(data.test)
      } else {
        setTestResult({ ok: false, error: data.error ?? 'Test failed' })
      }
    } catch {
      setTestResult({ ok: false, error: 'Network error' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/sso`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sso),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to save SSO config')
        return
      }

      if (data.sso) {
        setSso(data.sso)
        setInitial(data.sso)
      }
      setSuccess(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        Loading SSO configuration...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <h3 className="text-sm font-medium">OIDC Single Sign-On</h3>
          <p className="text-xs text-muted-foreground">
            Configure an OIDC identity provider for workspace members.
          </p>
        </div>
      </div>

      {/* Enable/Disable toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label className="text-sm font-medium">Enable SSO</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            When enabled, workspace members can sign in via your identity provider.
          </p>
        </div>
        <Switch
          checked={sso.enabled}
          onCheckedChange={(checked: boolean) => setSso((prev) => ({ ...prev, enabled: checked }))}
          disabled={saving}
        />
      </div>

      {/* Discovery URL */}
      <div className="space-y-1.5">
        <Label htmlFor="sso-discovery-url" className="text-sm font-medium">
          OIDC Discovery URL
        </Label>
        <p className="text-xs text-muted-foreground">
          The issuer URL or .well-known/openid-configuration endpoint.
        </p>
        <div className="flex gap-2">
          <Input
            id="sso-discovery-url"
            type="url"
            value={sso.discovery_url}
            onChange={(e) => setSso((prev) => ({ ...prev, discovery_url: e.target.value }))}
            placeholder="https://accounts.google.com"
            className="h-8 text-sm flex-1 max-w-md"
            disabled={saving}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!sso.discovery_url || testing}
            onClick={handleTestConnection}
          >
            {testing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" strokeWidth={1.5} />
                Testing...
              </>
            ) : (
              'Test connection'
            )}
          </Button>
        </div>
        {testResult && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              testResult.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
            }`}
          >
            {testResult.ok ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Connected to {testResult.issuer}
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                {testResult.error}
              </>
            )}
          </div>
        )}
      </div>

      {/* Client ID */}
      <div className="space-y-1.5">
        <Label htmlFor="sso-client-id" className="text-sm font-medium">
          Client ID
        </Label>
        <Input
          id="sso-client-id"
          value={sso.client_id}
          onChange={(e) => setSso((prev) => ({ ...prev, client_id: e.target.value }))}
          placeholder="your-client-id"
          className="h-8 text-sm max-w-md"
          disabled={saving}
          autoComplete="off"
        />
      </div>

      {/* Client Secret */}
      <div className="space-y-1.5">
        <Label htmlFor="sso-client-secret" className="text-sm font-medium">
          Client Secret
        </Label>
        <Input
          id="sso-client-secret"
          type="password"
          value={sso.client_secret}
          onChange={(e) => setSso((prev) => ({ ...prev, client_secret: e.target.value }))}
          placeholder="your-client-secret"
          className="h-8 text-sm max-w-md"
          disabled={saving}
          autoComplete="off"
        />
      </div>

      {/* Scopes */}
      <div className="space-y-1.5">
        <Label htmlFor="sso-scopes" className="text-sm font-medium">
          Scopes
        </Label>
        <Input
          id="sso-scopes"
          value={sso.scopes}
          onChange={(e) => setSso((prev) => ({ ...prev, scopes: e.target.value }))}
          placeholder="openid email profile"
          className="h-8 text-sm max-w-md"
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Space-separated list of OIDC scopes.
        </p>
      </div>

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {success && <p className="text-xs text-[var(--color-success)]">SSO configuration saved.</p>}

      <Button type="submit" size="sm" disabled={saving || !hasChanges}>
        {saving ? 'Saving\u2026' : 'Save SSO config'}
      </Button>
    </form>
  )
}
