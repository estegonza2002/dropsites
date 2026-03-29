'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ConflictBannerProps = {
  onDiscard: () => void
  onKeep: () => void
  onViewDiff?: () => void
}

export function ConflictBanner({
  onDiscard,
  onKeep,
  onViewDiff,
}: ConflictBannerProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-md px-4 py-3 text-sm sm:flex-row sm:items-center"
      style={{
        backgroundColor: 'var(--color-danger-subtle)',
        borderLeft: '3px solid var(--color-danger)',
        color: 'var(--color-danger)',
      }}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} strokeWidth={1.5} className="shrink-0" />
        <span className="font-medium" style={{ color: 'inherit' }}>
          This deployment was updated externally since you opened the editor
        </span>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onDiscard}
          className="text-xs"
        >
          Discard my changes
        </Button>
        {onViewDiff && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDiff}
            className="text-xs"
          >
            View diff
          </Button>
        )}
        <Button
          size="sm"
          onClick={onKeep}
          className="text-xs"
          style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
        >
          Keep my version
        </Button>
      </div>
    </div>
  )
}
