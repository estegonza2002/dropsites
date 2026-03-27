"use client"

import { useEffect, useState } from 'react'

interface QuotaData {
  deployments: { used: number; limit: number }
  storage: { usedBytes: number; limitBytes: number }
  bandwidth: { usedBytes: number; limitBytes: number }
}

interface QuotaDisplayProps {
  workspaceId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatLimit(value: number): string {
  return value === -1 ? '∞' : String(value)
}

function formatBytesLimit(bytes: number): string {
  return bytes === -1 ? '∞' : formatBytes(bytes)
}

export function QuotaDisplay({ workspaceId }: QuotaDisplayProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null)

  useEffect(() => {
    fetch(`/api/v1/quota?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setQuota(data))
      .catch(() => null)
  }, [workspaceId])

  if (!quota) return null

  const { deployments, storage } = quota
  const storageAtLimit =
    storage.limitBytes !== -1 && storage.usedBytes >= storage.limitBytes

  return (
    <p
      className={[
        'text-xs text-center',
        storageAtLimit ? 'text-destructive' : 'text-muted-foreground',
      ].join(' ')}
    >
      {deployments.used} of {formatLimit(deployments.limit)} deployment
      {deployments.limit === 1 ? '' : 's'} used
      {' · '}
      {formatBytes(storage.usedBytes)} of {formatBytesLimit(storage.limitBytes)} storage
    </p>
  )
}
