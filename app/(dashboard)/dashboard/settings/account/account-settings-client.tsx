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

interface AccountSettingsClientProps {
  userEmail: string
}

export function AccountSettingsClient({ userEmail }: AccountSettingsClientProps) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmText === 'DELETE'

  async function handleDelete() {
    setError(null)
    setDeleting(true)

    try {
      const res = await fetch('/api/v1/account/delete', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to delete account')
        return
      }

      router.push('/')
    } catch {
      setError('Network error — please try again')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-danger)]/20 p-4 space-y-3">
      <h3 className="text-sm font-medium text-[var(--color-danger)]">Danger zone</h3>
      <p className="text-xs text-muted-foreground">
        Permanently delete your account and all associated data. This will remove your
        personal workspace, all deployments, and revoke access to shared workspaces.
      </p>
      <p className="text-xs text-muted-foreground">
        Signed in as <strong>{userEmail}</strong>
      </p>

      <AlertDialog onOpenChange={() => { setConfirmText(''); setError(null) }}>
        <AlertDialogTrigger
          render={
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              Delete account
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, personal workspace, and all
              associated deployments. This action cannot be undone. Type{' '}
              <strong>DELETE</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
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
              {deleting ? 'Deleting\u2026' : 'Delete my account'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
