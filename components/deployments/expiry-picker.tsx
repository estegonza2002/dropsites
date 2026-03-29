'use client'

import { useState, useCallback } from 'react'
import { Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ExpiryPickerProps {
  slug: string
  expiresAt: string | null
  onUpdate: (expiresAt: string | null) => void
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = target.getTime() - now.getTime()

  if (diffMs <= 0) return 'Expired'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
  }
  if (diffHours > 0) {
    return `Expires in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  }
  if (diffMinutes > 0) {
    return `Expires in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  }
  return 'Expires in less than a minute'
}

function toLocalDatetimeValue(isoStr: string): string {
  const d = new Date(isoStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getMinDatetimeValue(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function ExpiryPicker({ slug, expiresAt, onUpdate }: ExpiryPickerProps) {
  const [saving, setSaving] = useState(false)
  const [localValue, setLocalValue] = useState(
    expiresAt ? toLocalDatetimeValue(expiresAt) : '',
  )

  const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : false

  const handleSave = useCallback(
    async (newExpiresAt: string | null) => {
      setSaving(true)
      try {
        const res = await fetch(`/api/v1/deployments/${slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expires_at: newExpiresAt }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(
            (data as { error?: string }).error ?? 'Failed to update expiry',
          )
        }
        onUpdate(newExpiresAt)
        if (newExpiresAt) {
          toast.success('Expiry date set')
        } else {
          toast.success('Expiry removed')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update expiry')
      } finally {
        setSaving(false)
      }
    },
    [slug, onUpdate],
  )

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setLocalValue(val)
    if (val) {
      const isoStr = new Date(val).toISOString()
      handleSave(isoStr)
    }
  }

  function handleRemoveExpiry() {
    setLocalValue('')
    handleSave(null)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`expiry-${slug}`} className="text-xs text-muted-foreground">
        <Clock size={16} strokeWidth={1.5} className="shrink-0" />
        Link expiry
      </Label>

      <div className="flex items-center gap-2">
        <Input
          id={`expiry-${slug}`}
          type="datetime-local"
          value={localValue}
          min={getMinDatetimeValue()}
          onChange={handleDateChange}
          disabled={saving}
          className="max-w-[220px]"
        />

        {expiresAt && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleRemoveExpiry}
                disabled={saving}
                aria-label="Remove expiry"
              >
                <X size={16} strokeWidth={1.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove expiry</TooltipContent>
          </Tooltip>
        )}
      </div>

      {expiresAt && (
        <p
          className="text-xs"
          style={{ color: isExpired ? 'var(--color-danger)' : 'var(--color-expiring)' }}
        >
          {isExpired ? 'Expired' : formatRelativeTime(expiresAt)}
        </p>
      )}
    </div>
  )
}
