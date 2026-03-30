'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Globe,
  Check,
  X,
  Loader2,
  Trash2,
} from 'lucide-react'

interface NamespaceSettingsProps {
  workspaceId: string
  currentNamespace: string | null
}

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function NamespaceSettings({
  workspaceId,
  currentNamespace,
}: NamespaceSettingsProps) {
  const [namespace, setNamespace] = useState(currentNamespace ?? '')
  const [availability, setAvailability] = useState<AvailabilityState>('idle')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : ''

  // Debounced availability check
  useEffect(() => {
    if (!namespace || namespace === currentNamespace) {
      setAvailability('idle')
      return
    }

    // Basic validation
    if (namespace.length < 3 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(namespace)) {
      setAvailability('invalid')
      return
    }

    setAvailability('checking')

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        // Use a simple GET to check — the PUT endpoint will do the real validation
        setAvailability('available') // Optimistic — server validates on save
      } catch {
        setAvailability('idle')
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [namespace, currentNamespace])

  const handleSave = useCallback(async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/namespace`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ namespace }),
        },
      )

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to set namespace')
        if (data.error?.includes('taken')) {
          setAvailability('taken')
        }
        return
      }

      setSuccess('Namespace updated successfully')
      setAvailability('idle')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }, [workspaceId, namespace])

  const handleRemove = useCallback(async () => {
    setError(null)
    setSuccess(null)
    setRemoving(true)

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/namespace`,
        { method: 'DELETE' },
      )

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to remove namespace')
        return
      }

      setNamespace('')
      setSuccess('Namespace removed')
    } catch {
      setError('Network error')
    } finally {
      setRemoving(false)
    }
  }, [workspaceId])

  const hasChanged = namespace !== (currentNamespace ?? '')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe size={20} strokeWidth={1.5} />
        <h3 className="text-base font-medium">Namespace</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Set a namespace for your workspace to scope deployment URLs. Deployments
        will be accessible at{' '}
        <code className="text-xs bg-muted rounded px-1 py-0.5">
          {appUrl}/~{namespace || 'your-namespace'}/slug
        </code>
      </p>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="namespace-slug" className="text-sm font-medium">
            Namespace slug
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="namespace-slug"
                value={namespace}
                onChange={(e) =>
                  setNamespace(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  )
                }
                placeholder="my-team"
                className="h-8 text-sm pr-8"
                autoComplete="off"
                maxLength={32}
              />
              {availability === 'checking' && (
                <Loader2
                  size={14}
                  strokeWidth={1.5}
                  className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
              {availability === 'available' && (
                <Check
                  size={14}
                  strokeWidth={1.5}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-success)]"
                />
              )}
              {availability === 'taken' && (
                <X
                  size={14}
                  strokeWidth={1.5}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-danger)]"
                />
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanged || !namespace || saving || availability === 'invalid'}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {currentNamespace && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={handleRemove}
                      disabled={removing}
                    />
                  }
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </TooltipTrigger>
                <TooltipContent>Remove namespace</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          3-32 characters. Lowercase letters, numbers, and hyphens only.
        </p>

        {namespace && availability !== 'invalid' && (
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">URL preview</p>
            <p className="text-sm font-mono mt-0.5">
              {appUrl}/~{namespace}/
              <span className="text-muted-foreground">your-slug</span>
            </p>
          </div>
        )}

        {availability === 'invalid' && namespace && (
          <p className="text-xs text-[var(--color-danger)]">
            Must be 3-32 characters, lowercase alphanumeric with hyphens. Cannot
            start or end with a hyphen.
          </p>
        )}

        {availability === 'taken' && (
          <p className="text-xs text-[var(--color-danger)]">
            This namespace is already taken.
          </p>
        )}

        {error && (
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        )}

        {success && (
          <p className="text-xs text-[var(--color-success)]">{success}</p>
        )}
      </div>
    </div>
  )
}
