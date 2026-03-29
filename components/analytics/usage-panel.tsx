'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BandwidthChart } from './bandwidth-chart'
import type { BandwidthPoint } from '@/lib/analytics/bandwidth'

interface UsagePanelProps {
  workspaceId: string
}

interface QuotaInfo {
  bandwidth: { used: number; limit: number }
  storage: { used: number; limit: number }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100)
  const color = pct >= 100 ? 'var(--color-danger)' : pct >= 80 ? 'var(--color-warning)' : 'var(--color-accent)'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatBytes(used)} / {unlimited ? 'Unlimited' : formatBytes(limit)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function UsagePanel({ workspaceId }: UsagePanelProps) {
  const [bandwidth, setBandwidth] = useState<BandwidthPoint[]>([])
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [bwRes, quotaRes] = await Promise.all([
        fetch(`/api/v1/analytics/bandwidth?workspaceId=${workspaceId}&days=30`),
        fetch(`/api/v1/quota?workspaceId=${workspaceId}`),
      ])
      if (bwRes.ok) {
        const bwData = await bwRes.json()
        setBandwidth(bwData.data ?? [])
      }
      if (quotaRes.ok) {
        const q = await quotaRes.json()
        setQuota({
          bandwidth: { used: q.bandwidth?.usedBytes ?? 0, limit: q.bandwidth?.limitBytes ?? -1 },
          storage: { used: q.storage?.usedBytes ?? 0, limit: q.storage?.limitBytes ?? -1 },
        })
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    const res = await fetch(`/api/v1/analytics/bandwidth/export?workspaceId=${workspaceId}&days=30`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bandwidth.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="rounded-lg border border-border bg-background p-4 animate-pulse h-48" />
  }

  return (
    <div className="space-y-4">
      {quota && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Usage</h3>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon-xs" onClick={handleExport}>
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                }
              />
              <TooltipContent>Export bandwidth CSV</TooltipContent>
            </Tooltip>
          </div>
          <QuotaBar label="Bandwidth (this month)" used={quota.bandwidth.used} limit={quota.bandwidth.limit} />
          <QuotaBar label="Storage" used={quota.storage.used} limit={quota.storage.limit} />
        </div>
      )}
      <BandwidthChart data={bandwidth} />
    </div>
  )
}
