'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface WorkspaceDangerZoneProps {
  workspaceId: string
  workspaceName: string
  isPersonal: boolean
}

export function WorkspaceDangerZone({ workspaceId, workspaceName, isPersonal }: WorkspaceDangerZoneProps) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmText === workspaceName

  async function handleDelete() {
    setError(null)
    setDeleting(true)

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to delete workspace')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setDeleting(false)
    }
  }

  if (isPersonal) {
    return (
      <div className="rounded-lg border border-[var(--color-danger)]/20 p-4">
        <h3 className="text-sm font-medium text-[var(--color-danger)]">Danger zone</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Your personal workspace cannot be deleted.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--color-danger)]/20 p-4 space-y-3">
      <h3 className="text-sm font-medium text-[var(--color-danger)]">Danger zone</h3>
      <p className="text-xs text-muted-foreground">
        Deleting this workspace will remove all deployments and member access. This cannot be undone.
      </p>

      <AlertDialog onOpenChange={() => { setConfirmText(''); setError(null) }}>
        <AlertDialogTrigger
          render={
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              Delete workspace
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{workspaceName}</strong> and all its deployments.
              Type the workspace name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={workspaceName}
            className="h-8 text-sm"
            autoComplete="off"
          />
          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              disabled={!confirmed || deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting\u2026' : 'Delete permanently'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
