'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RoleSelect } from '@/components/workspace/role-select'

interface InviteFormProps {
  workspaceId: string
  onInvited?: () => void
}

export function InviteForm({ workspaceId, onInvited }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'publisher' | 'viewer'>('viewer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setLoading(true)
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, role }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send invitation')
        return
      }

      setSuccess(`Invitation sent to ${trimmed}`)
      setEmail('')
      onInvited?.()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label className="text-sm font-medium">Invite member</Label>
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          className="h-8 text-sm flex-1"
          disabled={loading}
          required
        />
        <RoleSelect value={role} onValueChange={setRole} disabled={loading} />
        <Button type="submit" size="sm" disabled={loading || !email.trim()}>
          <Send className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
          Invite
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {success && <p className="text-xs text-[var(--color-success)]">{success}</p>}
    </form>
  )
}
