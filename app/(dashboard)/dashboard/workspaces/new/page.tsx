'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NamespaceInput } from '@/components/workspace/namespace-input'

export default function NewWorkspacePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [namespace, setNamespace] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)

    try {
      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          namespace_slug: namespace || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create workspace')
        return
      }

      // Set the new workspace as active
      document.cookie = `ds-workspace=${data.workspace.id};path=/;max-age=${7 * 24 * 3600};samesite=lax`
      router.push(`/dashboard/workspaces/${data.workspace.id}/settings`)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" strokeWidth={1.5} />
            Create workspace
          </CardTitle>
          <CardDescription>
            Workspaces let you organize deployments and collaborate with your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name" className="text-sm font-medium">
                Workspace name
              </Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Team"
                className="h-8 text-sm"
                disabled={creating}
                required
                minLength={2}
                maxLength={128}
                autoFocus
              />
            </div>

            <NamespaceInput value={namespace} onChange={setNamespace} disabled={creating} />

            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" disabled={creating || !name.trim()}>
                {creating ? 'Creating\u2026' : 'Create workspace'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
