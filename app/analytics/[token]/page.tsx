import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getViewStats,
  getTopReferrers,
  getTimeSeriesViews,
  getTopCountries,
  getDeviceBreakdown,
  getTopBrowsers,
} from '@/lib/analytics/query'
import { StatsCards } from '@/components/analytics/stats-cards'
import { ViewChart } from '@/components/analytics/view-chart'
import { ReferrerTable } from '@/components/analytics/referrer-table'
import { CountryChart } from '@/components/analytics/country-chart'
import { DeviceChart } from '@/components/analytics/device-chart'

interface PageProps {
  params: Promise<{ token: string }>
}

/**
 * Public analytics view for shareable links.
 * Validates the token and renders read-only analytics.
 */
export default async function SharedAnalyticsPage({ params }: PageProps) {
  const { token } = await params

  const admin = createAdminClient()

  // Look up the share token
  const { data: shareToken } = await admin
    .from('analytics_share_tokens')
    .select('deployment_id, expires_at')
    .eq('token', token)
    .single()

  if (!shareToken) {
    notFound()
  }

  // Check expiry
  if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
    notFound()
  }

  const deploymentId = shareToken.deployment_id

  // Fetch deployment name for display
  const { data: deployment } = await admin
    .from('deployments')
    .select('slug, namespace')
    .eq('id', deploymentId)
    .single()

  if (!deployment) {
    notFound()
  }

  const range = '30d'

  const [stats, referrers, timeSeries, countries, devices, browsers] = await Promise.all([
    getViewStats(deploymentId, range),
    getTopReferrers(deploymentId, range),
    getTimeSeriesViews(deploymentId, range),
    getTopCountries(deploymentId, range),
    getDeviceBreakdown(deploymentId, range),
    getTopBrowsers(deploymentId, range),
  ])

  const displayName = deployment.namespace
    ? `${deployment.namespace}/${deployment.slug}`
    : deployment.slug

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-lg font-medium">Analytics for {displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last 30 days &middot; Read-only shared view
        </p>
      </div>

      <div className="space-y-6">
        <StatsCards stats={stats} />
        <ViewChart data={timeSeries} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CountryChart countries={countries} />
          <ReferrerTable referrers={referrers} />
        </div>

        <DeviceChart devices={devices} browsers={browsers} />
      </div>
    </div>
  )
}
