'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Copy,
  Share2,
  Lock,
  Upload,
  Files,
  Pencil,
  EyeOff,
  Eye,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { InlinePasswordDialog } from './inline-password-popover'
import { InlineUpload } from '@/components/upload/inline-upload'
import { ShareSheet } from '@/components/share/share-sheet'
import type { DeploymentListItem } from './deployment-table'

type Role = 'owner' | 'publisher' | 'viewer'

interface DeploymentRowActionsProps {
  deployment: DeploymentListItem
  role: Role
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<DeploymentListItem>) => void
  onDuplicate: (newDeployment: DeploymentListItem) => void
}

export function DeploymentRowActions({
  deployment,
  role,
  onDelete,
  onUpdate,
  onDuplicate,
}: DeploymentRowActionsProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(deployment.slug)
  const [renameLoading, setRenameLoading] = useState(false)
  const [showInlineUpload, setShowInlineUpload] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const isViewer = role === 'viewer'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const deploymentUrl = `${APP_URL}/s/${deployment.slug}`

  function handleCopyUrl() {
    navigator.clipboard.writeText(deploymentUrl).then(() => toast.success('URL copied'))
  }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/v1/deployments/${deployment.slug}/duplicate`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to duplicate')
      }
      const data: { slug: string } = await res.json()
      toast.success(`Duplicated as ${data.slug}`)
      const now = new Date().toISOString()
      onDuplicate({
        ...deployment,
        id: crypto.randomUUID(),
        slug: data.slug,
        password_hash: null,
        is_disabled: false,
        total_views: 0,
        created_at: now,
      })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate')
    } finally {
      setDuplicating(false)
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    const newSlug = renameValue.trim()
    if (newSlug === deployment.slug || !newSlug) {
      setRenameOpen(false)
      return
    }
    setRenameLoading(true)
    try {
      const res = await fetch(`/api/v1/deployments/${deployment.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newSlug }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to rename')
      }
      toast.success(`Renamed to ${newSlug}`)
      onUpdate(deployment.id, { slug: newSlug })
      setRenameOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename')
    } finally {
      setRenameLoading(false)
    }
  }

  async function handleToggleDisable() {
    const enabling = deployment.is_disabled
    setToggling(true)
    try {
      const res = await fetch(`/api/v1/deployments/${deployment.slug}/disable`, {
        method: enabling ? 'DELETE' : 'POST',
      })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to update')
      }
      toast.success(enabling ? 'Deployment reactivated' : 'Deployment disabled')
      onUpdate(deployment.id, { is_disabled: !enabling })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/deployments/${deployment.slug}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      }
      toast.success('Deployment deleted')
      onDelete(deployment.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <Tooltip>
          <TooltipTrigger>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[popup-open]:opacity-100"
                  aria-label="Deployment actions"
                >
                  <MoreHorizontal size={16} strokeWidth={1.5} />
                </Button>
              }
            />
          </TooltipTrigger>
          <TooltipContent side="left">Actions</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyUrl}>
            <Copy size={16} strokeWidth={1.5} className="mr-2" />
            Copy URL
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              setDropdownOpen(false)
              setShareOpen(true)
            }}
          >
            <Share2 size={16} strokeWidth={1.5} className="mr-2" />
            Share
          </DropdownMenuItem>

          {!isViewer && (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => {
                  setDropdownOpen(false)
                  setPasswordDialogOpen(true)
                }}
              >
                <Lock size={16} strokeWidth={1.5} className="mr-2" />
                {deployment.password_hash ? 'Change password' : 'Set password'}
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setDropdownOpen(false)
                  setShowInlineUpload(true)
                }}
              >
                <Upload size={16} strokeWidth={1.5} className="mr-2" />
                Update content
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleDuplicate}
                disabled={duplicating}
              >
                <Files size={16} strokeWidth={1.5} className="mr-2" />
                {duplicating ? 'Duplicating…' : 'Duplicate'}
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setRenameValue(deployment.slug)
                  setDropdownOpen(false)
                  setRenameOpen(true)
                }}
              >
                <Pencil size={16} strokeWidth={1.5} className="mr-2" />
                Rename slug
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleToggleDisable}
                disabled={toggling}
              >
                {deployment.is_disabled ? (
                  <>
                    <Eye size={16} strokeWidth={1.5} className="mr-2" />
                    {toggling ? 'Reactivating…' : 'Reactivate'}
                  </>
                ) : (
                  <>
                    <EyeOff size={16} strokeWidth={1.5} className="mr-2" />
                    {toggling ? 'Disabling…' : 'Disable'}
                  </>
                )}
              </DropdownMenuItem>

              {role === 'owner' && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => {
                    setDropdownOpen(false)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 size={16} strokeWidth={1.5} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showInlineUpload && (
        <InlineUpload
          slug={deployment.slug}
          onSuccess={() => {
            setShowInlineUpload(false)
            router.refresh()
          }}
          onCancel={() => setShowInlineUpload(false)}
        />
      )}

      <InlinePasswordDialog
        slug={deployment.slug}
        hasPassword={!!deployment.password_hash}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onPasswordChange={(has) =>
          onUpdate(deployment.id, { password_hash: has ? '__set__' : null })
        }
      />

      {/* Rename dialog */}
      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename slug</AlertDialogTitle>
            <AlertDialogDescription>
              The old URL will redirect to the new one for 90 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleRename}>
            <input
              className="mt-2 mb-4 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="new-slug"
              autoFocus
              disabled={renameLoading}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={renameLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                disabled={renameLoading || !renameValue.trim() || renameValue.trim() === deployment.slug}
              >
                {renameLoading ? 'Renaming…' : 'Rename'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        slug={deployment.slug}
        hasPassword={!!deployment.password_hash}
        onPasswordChange={(has) =>
          onUpdate(deployment.id, { password_hash: has ? '__set__' : null })
        }
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deployment?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deployment.slug}</strong> will be permanently removed and its URL will stop working.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
