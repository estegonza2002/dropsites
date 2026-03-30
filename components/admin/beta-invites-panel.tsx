'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Copy, RefreshCw } from 'lucide-react'

interface BetaInvite {
  id: string
  email: string
  invite_code: string
  status: 'pending' | 'accepted' | 'expired'
  notes: string | null
  invited_at: string
  accepted_at: string | null
  created_by: string | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: BetaInvite['status'] }) {
  if (status === 'accepted') {
    return <Badge className="border" style={{ background: 'var(--color-success-muted)', color: 'var(--color-success)' }}>Accepted</Badge>
  }
  if (status === 'expired') {
    return <Badge className="border" style={{ background: 'var(--color-warning-muted)', color: 'var(--color-warning)' }}>Expired</Badge>
  }
  return <Badge variant="secondary">Pending</Badge>
}

export function BetaInvitesPanel() {
  const [invites, setInvites] = useState<BetaInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchInvites = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/beta/invites')
      if (res.ok) {
        const json = await res.json() as { invites: BetaInvite[] }
        setInvites(json.invites ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchInvites()
  }, [fetchInvites])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/admin/beta/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), notes: notes.trim() }),
      })
      if (res.ok) {
        const json = await res.json() as { invite: BetaInvite }
        setInvites((prev) => [json.invite, ...prev])
        setDialogOpen(false)
        setEmail('')
        setNotes('')
      } else {
        const json = await res.json() as { error?: string }
        setError(json.error ?? 'Failed to create invite')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  function copyInviteLink(code: string) {
    const url = `${window.location.origin}/beta/accept?code=${code}`
    void navigator.clipboard.writeText(url)
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Beta Invites</h2>
            <p className="text-sm text-muted-foreground">
              {invites.length} invite{invites.length !== 1 ? 's' : ''} sent
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="outline" size="icon" onClick={() => void fetchInvites()}>
                  <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Add invite
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : invites.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No invites yet. Send the first one.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={invite.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invite.invited_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invite.accepted_at)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {invite.notes ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInviteLink(invite.invite_code)}
                          >
                            <Copy className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy invite link</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add beta invite</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-notes">Notes (optional)</Label>
                <Textarea
                  id="invite-notes"
                  placeholder="How did we meet? Why are they a good beta tester?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    setError(null)
                    setEmail('')
                    setNotes('')
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send invite'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
