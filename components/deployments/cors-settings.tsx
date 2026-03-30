'use client'

import { useCallback, useEffect, useState } from 'react'
import { Globe, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { CorsMode } from '@/lib/serving/cors'

interface CorsSettingsProps {
  slug: string
  /** Initial config loaded from the deployment. */
  initialMode: CorsMode
  initialOrigins: string[]
  initialMethods: string[]
  initialHeaders: string[]
}

const DEFAULT_METHODS = ['GET', 'HEAD', 'OPTIONS']

export function CorsSettings({
  slug,
  initialMode,
  initialOrigins,
  initialMethods,
  initialHeaders,
}: CorsSettingsProps) {
  const [mode, setMode] = useState<CorsMode>(initialMode)
  const [origins, setOrigins] = useState<string[]>(
    initialOrigins.length > 0 ? initialOrigins : [''],
  )
  const [methods, setMethods] = useState<string[]>(
    initialMethods.length > 0 ? initialMethods : DEFAULT_METHODS,
  )
  const [allowHeaders, setAllowHeaders] = useState<string[]>(
    initialHeaders.length > 0 ? initialHeaders : [''],
  )
  const [saving, setSaving] = useState(false)

  // Sync when parent props change (e.g. after a re-fetch)
  useEffect(() => {
    setMode(initialMode)
    setOrigins(initialOrigins.length > 0 ? initialOrigins : [''])
    setMethods(initialMethods.length > 0 ? initialMethods : DEFAULT_METHODS)
    setAllowHeaders(initialHeaders.length > 0 ? initialHeaders : [''])
  }, [initialMode, initialOrigins, initialMethods, initialHeaders])

  const handleWildcardToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        setMode('wildcard')
      } else {
        setMode('none')
      }
    },
    [],
  )

  const handleCustomToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        setMode('custom')
      } else {
        setMode('none')
      }
    },
    [],
  )

  function updateOrigin(index: number, value: string) {
    setOrigins((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function addOrigin() {
    setOrigins((prev) => [...prev, ''])
  }

  function removeOrigin(index: number) {
    setOrigins((prev) => prev.filter((_, i) => i !== index))
  }

  function updateHeader(index: number, value: string) {
    setAllowHeaders((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function addHeader() {
    setAllowHeaders((prev) => [...prev, ''])
  }

  function removeHeader(index: number) {
    setAllowHeaders((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { mode }
      if (mode === 'custom') {
        body.origins = origins.filter((o) => o.trim().length > 0)
        body.methods = methods
        body.headers = allowHeaders.filter((h) => h.trim().length > 0)
      }

      const res = await fetch(`/api/v1/deployments/${slug}/cors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(data.error ?? 'Failed to update CORS settings')
      }

      toast.success('CORS settings saved')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save CORS settings',
      )
    } finally {
      setSaving(false)
    }
  }

  const isWildcard = mode === 'wildcard'
  const isCustom = mode === 'custom'

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Globe size={20} strokeWidth={1.5} className="mt-0.5 text-muted-foreground" />
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-medium">CORS Headers</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Control cross-origin access to your deployment files.
            </p>
          </div>

          {/* Wildcard toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="cors-wildcard" className="text-sm">
              Allow all origins (Access-Control-Allow-Origin: *)
            </Label>
            <Switch
              id="cors-wildcard"
              checked={isWildcard}
              onCheckedChange={handleWildcardToggle}
              disabled={isCustom}
            />
          </div>

          {/* Custom toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="cors-custom" className="text-sm">
              Custom origins (advanced)
            </Label>
            <Switch
              id="cors-custom"
              checked={isCustom}
              onCheckedChange={handleCustomToggle}
              disabled={isWildcard}
            />
          </div>

          {/* Custom origins list */}
          {isCustom && (
            <div className="space-y-3 pl-0.5">
              <div className="space-y-2">
                <Label className="text-sm">Allowed Origins</Label>
                {origins.map((origin, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={origin}
                      onChange={(e) => updateOrigin(i, e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1"
                    />
                    {origins.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOrigin(i)}
                        aria-label="Remove origin"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOrigin}
                  className="gap-1"
                >
                  <Plus size={16} strokeWidth={1.5} />
                  Add origin
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Allowed Methods</Label>
                <Input
                  value={methods.join(', ')}
                  onChange={(e) =>
                    setMethods(
                      e.target.value
                        .split(',')
                        .map((m) => m.trim().toUpperCase())
                        .filter(Boolean),
                    )
                  }
                  placeholder="GET, HEAD, OPTIONS"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Allowed Headers</Label>
                {allowHeaders.map((header, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={header}
                      onChange={(e) => updateHeader(i, e.target.value)}
                      placeholder="Content-Type"
                      className="flex-1"
                    />
                    {allowHeaders.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHeader(i)}
                        aria-label="Remove header"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHeader}
                  className="gap-1"
                >
                  <Plus size={16} strokeWidth={1.5} />
                  Add header
                </Button>
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="mt-2"
          >
            {saving ? 'Saving...' : 'Save CORS settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
