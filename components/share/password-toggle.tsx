'use client'

import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PasswordToggleProps {
  slug: string
  hasPassword: boolean
  onPasswordChange: (hasPassword: boolean) => void
}

const MIN_LENGTH = 8

export function PasswordToggle({
  slug,
  hasPassword,
  onPasswordChange,
}: PasswordToggleProps) {
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_LENGTH) {
      toast.error(`Password must be at least ${MIN_LENGTH} characters`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/deployments/${slug}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to set password')
      }
      toast.success('Password set')
      onPasswordChange(true)
      setPassword('')
      setExpanded(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemovePassword() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/deployments/${slug}/password`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to remove password')
      }
      toast.success('Password removed')
      onPasswordChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove password')
    } finally {
      setLoading(false)
    }
  }

  if (hasPassword) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Lock size={16} strokeWidth={1.5} className="text-[var(--color-warning)]" />
          <span>Password protected</span>
        </div>
        <Button
          variant="ghost"
          size="xs"
          className="text-destructive hover:text-destructive"
          disabled={loading}
          onClick={handleRemovePassword}
        >
          {loading ? 'Removing...' : 'Remove'}
        </Button>
      </div>
    )
  }

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setExpanded(true)}
      >
        <LockOpen size={16} strokeWidth={1.5} className="mr-1.5" />
        Add password protection
      </Button>
    )
  }

  return (
    <form onSubmit={handleSetPassword} className="space-y-2">
      <Label htmlFor={`share-pw-${slug}`} className="text-xs text-muted-foreground">
        Password (min {MIN_LENGTH} characters)
      </Label>
      <div className="flex gap-2">
        <Input
          id={`share-pw-${slug}`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password..."
          autoComplete="new-password"
          disabled={loading}
          className="flex-1 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || password.length < MIN_LENGTH}
        >
          {loading ? 'Setting...' : 'Set'}
        </Button>
      </div>
    </form>
  )
}
