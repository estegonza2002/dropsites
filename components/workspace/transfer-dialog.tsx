'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Member {
  user_id: string
  email: string
  display_name: string
  role: 'owner' | 'publisher' | 'viewer'
}

interface TransferDialogProps {
  workspaceId: string
  workspaceName: string
  members: Member[]
  onTransferred?: () => void
}

export function TransferDialog({
  workspaceId,
  workspaceName,
  members,
  onTransferred,
}: TransferDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only non-owner members can receive ownership
  const transferableMembers = members.filter((m) => m.role !== 'owner' && m.user_id)

  async function handleTransfer() {
    if (!selectedUserId) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: selectedUserId }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message ?? 'Transfer failed')
        return
      }

      // Auto-confirm (in a real flow the new owner would confirm via email/notification)
      const confirmRes = await fetch(`/api/v1/workspaces/${workspaceId}/transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.data.token }),
      })

      if (!confirmRes.ok) {
        const confirmData = await confirmRes.json()
        setError(confirmData.error?.message ?? 'Confirmation failed')
        return
      }

      setOpen(false)
      onTransferred?.()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedMember = transferableMembers.find((m) => m.user_id === selectedUserId)

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); setSelectedUserId('') }}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" disabled={transferableMembers.length === 0}>
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                    Transfer ownership
                  </Button>
                }
              />
            }
          />
          <TooltipContent>
            {transferableMembers.length === 0
              ? 'No eligible members to transfer to'
              : 'Transfer workspace ownership to another member'}
          </TooltipContent>
        </Tooltip>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              Transfer ownership of <strong>{workspaceName}</strong> to another member.
              You will be demoted to Publisher and lose owner-level permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New owner</label>
              <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {transferableMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMember && (
              <div className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">This action will:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Make <strong>{selectedMember.display_name || selectedMember.email}</strong> the new owner</li>
                  <li>Demote you to Publisher role</li>
                  <li>Transfer billing responsibility to the new owner</li>
                  <li>Grant the new owner full admin control</li>
                </ul>
              </div>
            )}

            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              disabled={!selectedUserId || submitting}
              onClick={handleTransfer}
            >
              {submitting ? 'Transferring\u2026' : 'Transfer ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
