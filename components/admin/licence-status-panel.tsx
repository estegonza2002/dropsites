'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type LicenceStatus = 'valid' | 'expired' | 'invalid' | 'missing'

interface LicenceData {
  status: LicenceStatus
  customer: string | null
  expiresAt: string | null
  features: string[]
  deploymentLimit: number | null
  lastChecked: string | null
}

const statusConfig: Record<
  LicenceStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }
> = {
  valid: { label: 'Valid', variant: 'default', icon: CheckCircle },
  expired: { label: 'Expired', variant: 'destructive', icon: AlertTriangle },
  invalid: { label: 'Invalid', variant: 'destructive', icon: XCircle },
  missing: { label: 'Missing', variant: 'outline', icon: HelpCircle },
}

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function LicenceStatusPanel() {
  const [data, setData] = useState<LicenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLicence = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/licence')
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(
          body?.error?.message ?? `Request failed (${res.status})`,
        )
      }
      const json = await res.json()
      setData(json.data as LicenceData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load licence')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLicence()
  }, [fetchLicence])

  const config = data ? statusConfig[data.status] : null
  const StatusIcon = config?.icon ?? HelpCircle
  const daysUntilExpiry = data ? getDaysUntilExpiry(data.expiresAt) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Licence Status
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => void fetchLicence()}
                  disabled={loading}
                />
              }
            >
              <RefreshCw
                className={`size-4 ${loading ? 'animate-spin' : ''}`}
                strokeWidth={1.5}
              />
              <span className="sr-only">Refresh licence status</span>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Current licence information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {loading && !data && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}

        {data && (
          <>
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <StatusIcon className="size-4" strokeWidth={1.5} />
              <Badge variant={config?.variant ?? 'outline'}>
                {config?.label ?? 'Unknown'}
              </Badge>
            </div>

            {/* Customer */}
            {data.customer && (
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium">{data.customer}</p>
              </div>
            )}

            {/* Expiry */}
            {data.expiresAt && (
              <div>
                <p className="text-xs text-muted-foreground">Expires</p>
                <p className="text-sm font-medium">
                  {new Date(data.expiresAt).toLocaleDateString()}
                </p>
                {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                  <p className="text-xs" style={{ color: 'var(--color-expiring)' }}>
                    {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'} remaining
                  </p>
                )}
                {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                  <p className="text-xs text-destructive">Licence has expired</p>
                )}
              </div>
            )}

            {/* Deployment limit */}
            {data.deploymentLimit !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Deployment limit</p>
                <p className="text-sm font-medium">{data.deploymentLimit}</p>
              </div>
            )}

            {/* Feature flags */}
            {data.features.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Features</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.features.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Last checked */}
            {data.lastChecked && (
              <div>
                <p className="text-xs text-muted-foreground">Last checked</p>
                <p className="text-sm font-medium">
                  {new Date(data.lastChecked).toLocaleString()}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
