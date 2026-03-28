'use client'

import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InlinePasswordDialogProps {
  slug: string
  hasPassword: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onPasswordChange: (hasPassword: boolean) => void
}

const MIN_LENGTH = 8

export function InlinePasswordDialog({
  slug,
  hasPassword,
  open,
  onOpenChange,
  onPasswordChange,
}: InlinePasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setPassword('')
    onOpenChange(false)
  }

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
      handleClose()
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
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasPassword ? (
              <Lock size={16} strokeWidth={1.5} className="text-[var(--color-warning)]" />
            ) : (
              <LockOpen size={16} strokeWidth={1.5} className="text-muted-foreground" />
            )}
            {hasPassword ? 'Update password' : 'Set password'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSetPassword} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor={`pw-${slug}`} className="text-sm">
              New password (min {MIN_LENGTH} characters)
            </Label>
            <Input
              id={`pw-${slug}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password…"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || password.length < MIN_LENGTH}
          >
            {loading ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
          </Button>
        </form>

        {hasPassword && (
          <>
            <div className="border-t border-border" />
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={loading}
              onClick={handleRemovePassword}
            >
              Remove password
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
