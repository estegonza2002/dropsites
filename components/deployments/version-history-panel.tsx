'use client'

import { useState, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  History,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  Upload,
  Code,
  Zap,
} from 'lucide-react'
import { formatBytes, formatDate } from '@/lib/utils/format'

type VersionRecord = {
  id: string
  deployment_id: string
  version_number: number
  storage_path: string
  storage_bytes: number
  file_count: number
  source: 'upload' | 'editor' | 'api'
  published_by: string | null
  created_at: string
  is_live: boolean
}

interface VersionHistoryPanelProps {
  deploymentSlug: string
  initialVersions: VersionRecord[]
}

const SOURCE_ICONS: Record<string, typeof Upload> = {
  upload: Upload,
  editor: Code,
  api: Zap,
}

const SOURCE_LABELS: Record<string, string> = {
  upload: 'Upload',
  editor: 'Editor',
  api: 'API',
}

export function VersionHistoryPanel({
  deploymentSlug,
  initialVersions,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionRecord[]>(initialVersions)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(
    null,
  )
  const [isPending, startTransition] = useTransition()

  const refreshVersions = useCallback(async () => {
    const res = await fetch(
      `/api/v1/deployments/${deploymentSlug}/versions`,
    )
    if (res.ok) {
      const data = await res.json()
      setVersions(data)
    }
  }, [deploymentSlug])

  const handleRestore = useCallback(
    async (versionId: string) => {
      setRestoringId(versionId)
      try {
        const res = await fetch(
          `/api/v1/deployments/${deploymentSlug}/versions/${versionId}?action=restore`,
          { method: 'POST' },
        )
        if (res.ok) {
          startTransition(() => {
            refreshVersions()
          })
        }
      } finally {
        setRestoringId(null)
        setConfirmRestoreId(null)
      }
    },
    [deploymentSlug, refreshVersions, startTransition],
  )

  const handlePreview = useCallback(
    async (versionId: string) => {
      const res = await fetch(
        `/api/v1/deployments/${deploymentSlug}/versions/${versionId}?include=preview`,
      )
      if (res.ok) {
        const data = await res.json()
        if (data.preview_url) {
          window.open(data.preview_url, '_blank', 'noopener,noreferrer')
        }
      }
    },
    [deploymentSlug],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History size={20} strokeWidth={1.5} />
        <h3 className="text-base font-medium">Version History</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Last {versions.length} version{versions.length !== 1 ? 's' : ''} of
        this deployment.
      </p>

      <Separator />

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No version history available.
        </p>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-4 pl-4">
          {versions.map((v) => {
            const SourceIcon = SOURCE_ICONS[v.source] ?? Upload

            return (
              <li key={v.id} className="relative">
                {/* Timeline dot */}
                <span
                  className={`absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                    v.is_live
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-muted-foreground/40'
                  }`}
                />

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      v{v.version_number}
                    </span>
                    {v.is_live && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                        <CheckCircle2 size={12} strokeWidth={1.5} />
                        Live
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{formatDate(v.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <SourceIcon size={12} strokeWidth={1.5} />
                      {SOURCE_LABELS[v.source] ?? v.source}
                    </span>
                    <span>
                      {v.file_count} file{v.file_count !== 1 ? 's' : ''}
                    </span>
                    <span>{formatBytes(v.storage_bytes)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handlePreview(v.id)}
                          />
                        }
                      >
                        <ExternalLink
                          size={14}
                          strokeWidth={1.5}
                          data-icon="inline-start"
                        />
                        Preview
                      </TooltipTrigger>
                      <TooltipContent>Preview this version</TooltipContent>
                    </Tooltip>

                    {!v.is_live && (
                      <AlertDialog
                        open={confirmRestoreId === v.id}
                        onOpenChange={(open) =>
                          setConfirmRestoreId(open ? v.id : null)
                        }
                      >
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <AlertDialogTrigger
                                render={
                                  <Button variant="ghost" size="xs" />
                                }
                              />
                            }
                          >
                            <RotateCcw
                              size={14}
                              strokeWidth={1.5}
                              data-icon="inline-start"
                            />
                            Restore
                          </TooltipTrigger>
                          <TooltipContent>
                            Restore this version as live
                          </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogTitle>
                            Restore version {v.version_number}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will copy the files from version{' '}
                            {v.version_number} and make them the live
                            deployment. The current version will remain in
                            history.
                          </AlertDialogDescription>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmRestoreId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRestore(v.id)}
                              disabled={
                                restoringId === v.id || isPending
                              }
                            >
                              {restoringId === v.id
                                ? 'Restoring...'
                                : 'Restore'}
                            </Button>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
