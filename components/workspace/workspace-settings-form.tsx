'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NamespaceInput } from '@/components/workspace/namespace-input'

interface WorkspaceSettingsFormProps {
  workspaceId: string
  initialName: string
  initialNamespace: string
  onSaved?: () => void
}

export function WorkspaceSettingsForm({
  workspaceId,
  initialName,
  initialNamespace,
  onSaved,
}: WorkspaceSettingsFormProps) {
  const [name, setName] = useState(initialName)
  const [namespace, setNamespace] = useState(initialNamespace)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasChanges = name !== initialName || namespace !== initialNamespace

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), namespace_slug: namespace || null }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
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
        <Label htmlFor="ws-name" className="text-sm font-medium">
          Workspace name
        </Label>
        <Input
          id="ws-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm max-w-sm"
          disabled={saving}
          required
          minLength={2}
          maxLength={128}
        />
      </div>

      <NamespaceInput value={namespace} onChange={setNamespace} disabled={saving} />

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {success && <p className="text-xs text-[var(--color-success)]">Settings saved.</p>}

      <Button type="submit" size="sm" disabled={saving || !hasChanges}>
        {saving ? 'Saving\u2026' : 'Save changes'}
      </Button>
    </form>
  )
}
