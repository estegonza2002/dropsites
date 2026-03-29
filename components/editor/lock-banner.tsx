'use client'

import { Lock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

type LockBannerProps = {
  lockedByName: string | null
  lockedByEmail: string
  expiresAt: string | null
  onOpenReadOnly?: () => void
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return ''
  const expires = new Date(expiresAt)
  const now = new Date()
  const diffMs = expires.getTime() - now.getTime()
  const diffMin = Math.max(0, Math.round(diffMs / 60_000))
  if (diffMin === 0) return 'Lock expiring soon'
  return `Lock expires in ${diffMin} min`
}

export function LockBanner({
  lockedByName,
  lockedByEmail,
  expiresAt,
  onOpenReadOnly,
}: LockBannerProps) {
  const displayName = lockedByName || lockedByEmail
  const expiry = formatExpiry(expiresAt)

  return (
    <div
      className="flex items-center gap-3 rounded-md px-4 py-3 text-sm"
      style={{
        backgroundColor: 'var(--color-warning-subtle)',
        borderLeft: '3px solid var(--color-warning)',
        color: 'var(--color-warning)',
      }}
      role="alert"
    >
      <Lock size={20} strokeWidth={1.5} className="shrink-0" />
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="font-medium" style={{ color: 'inherit' }}>
          Currently being edited by {displayName}
        </span>
        {expiry && (
          <span className="text-xs opacity-80">{expiry}</span>
        )}
      </div>
      {onOpenReadOnly && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenReadOnly}
          className="shrink-0 gap-1.5"
        >
          <Eye size={16} strokeWidth={1.5} />
          Open as read-only
        </Button>
      )}
    </div>
  )
}
