'use client'

import { Save, Undo2, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

interface EditorToolbarProps {
  filePath: string | null
  slug: string
  changedFileCount: number
  isSaving: boolean
  onSavePublish: () => void
  onDiscard: () => void
}

export function EditorToolbar({
  filePath,
  slug,
  changedFileCount,
  isSaving,
  onSavePublish,
  onDiscard,
}: EditorToolbarProps) {
  const breadcrumbParts = filePath?.split('/') ?? []

  return (
    <div className="flex items-center justify-between border-b bg-background px-3 py-2 gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0 overflow-hidden">
        <span className="shrink-0 font-medium text-foreground">{slug}</span>
        {breadcrumbParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            <ChevronRight size={14} strokeWidth={1.5} className="text-muted-foreground" />
            <span className={i === breadcrumbParts.length - 1 ? 'font-medium text-foreground' : ''}>
              {part}
            </span>
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {changedFileCount > 0 && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {changedFileCount} file{changedFileCount !== 1 ? 's' : ''} changed
          </span>
        )}

        <button
          type="button"
          onClick={onDiscard}
          disabled={changedFileCount === 0 || isSaving}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          Discard changes
        </button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  onClick={onSavePublish}
                  disabled={changedFileCount === 0 || isSaving}
                  className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                >
                  {isSaving ? (
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <Save size={16} strokeWidth={1.5} data-icon="inline-start" />
                  )}
                  <span className="hidden sm:inline">Save &amp; Publish</span>
                </Button>
              }
            />
            <TooltipContent>Save changes and publish a new version</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
