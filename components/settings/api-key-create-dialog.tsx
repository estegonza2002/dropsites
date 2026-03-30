'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Plus, Copy, Check, AlertTriangle } from 'lucide-react'

interface ApiKeyCreateDialogProps {
  onCreated: () => void
}

export function ApiKeyCreateDialog({ onCreated }: ApiKeyCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function reset() {
    setName('')
    setExpiresAt('')
    setError(null)
    setCreatedKey(null)
    setCopied(false)
    setConfirmed(false)
    setLoading(false)
  }

  async function handleCreate() {
    setError(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = { name }
      if (expiresAt) body.expires_at = new Date(expiresAt).toISOString()

      const resp = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await resp.json()

      if (!resp.ok) {
        setError(json.error?.message ?? 'Failed to create key')
        return
      }

      setCreatedKey(json.data.key)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    if (createdKey) {
      onCreated()
    }
    setOpen(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && createdKey && !confirmed) return // prevent accidental close
        if (!nextOpen) handleClose()
        else setOpen(true)
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={<Button size="sm" />}
            />
          }
        >
          <Plus className="size-4 mr-1" strokeWidth={1.5} />
          Generate key
        </TooltipTrigger>
        <TooltipContent>Generate new API key</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. CI/CD Pipeline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-expiry">Expiry (optional)</Label>
                <Input
                  id="key-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {error && (
                <p className="text-xs text-[var(--color-danger)]">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || loading}
              >
                {loading ? 'Creating...' : 'Create key'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your key now. You will not be able to see it again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
                <code className="flex-1 break-all text-xs">
                  {createdKey}
                </code>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCopy}
                      />
                    }
                  >
                    {copied ? (
                      <Check className="size-4 text-[var(--color-success)]" strokeWidth={1.5} />
                    ) : (
                      <Copy className="size-4" strokeWidth={1.5} />
                    )}
                    <span className="sr-only">Copy</span>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? 'Copied' : 'Copy key'}</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning-muted)] bg-[var(--color-warning-subtle)] p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--color-warning)]" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground">
                  Store this key securely. It will not be displayed again after
                  you close this dialog.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setConfirmed(true)
                  handleClose()
                }}
              >
                I&apos;ve saved this key
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
