'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface BulkActionsBarProps {
  selectedSlugs: string[]
  onSuccess: (deletedIds: string[]) => void
  onClear: () => void
}

export function BulkActionsBar({ selectedSlugs, onSuccess, onClear }: BulkActionsBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (selectedSlugs.length === 0) return null

  async function handleBulkDelete() {
    setDeleting(true)
    const results = await Promise.allSettled(
      selectedSlugs.map((slug) =>
        fetch(`/api/v1/deployments/${slug}`, { method: 'DELETE' }),
      ),
    )

    const deleted: string[] = []
    const failed: string[] = []

    results.forEach((result, i) => {
      const slug = selectedSlugs[i]
      if (result.status === 'fulfilled' && (result.value.ok || result.value.status === 204)) {
        deleted.push(slug)
      } else {
        failed.push(slug)
      }
    })

    setDeleting(false)
    setConfirmOpen(false)

    if (deleted.length > 0) {
      toast.success(`Deleted ${deleted.length} deployment${deleted.length !== 1 ? 's' : ''}`)
      onSuccess(deleted)
    }
    if (failed.length > 0) {
      toast.error(`Failed to delete ${failed.length} deployment${failed.length !== 1 ? 's' : ''}`)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedSlugs.length}</span> selected
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
            Clear
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 size={14} strokeWidth={1.5} className="mr-1.5" />
            Delete selected ({selectedSlugs.length})
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedSlugs.length} deployment{selectedSlugs.length !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              These deployments will be permanently removed and their URLs will stop working.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleBulkDelete}
            >
              {deleting ? 'Deleting…' : `Delete ${selectedSlugs.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
