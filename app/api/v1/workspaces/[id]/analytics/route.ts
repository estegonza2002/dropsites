import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { ApiAuth } from '@/lib/api/auth'

// GET /api/v1/workspaces/[id]/analytics — aggregate analytics for workspace deployments
export const GET = withApiAuth(async (req: NextRequest, ctx, auth: ApiAuth) => {
  const { id: workspaceId } = await ctx.params

  const role = await getUserRole(auth.userId, workspaceId)
  if (!role) return apiError('Not found', 'not_found', 404)

  const url = new URL(req.url)
  const metric = url.searchParams.get('metric') ?? 'views'
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  if (!['views', 'bandwidth'].includes(metric)) {
    return apiError('metric must be "views" or "bandwidth"', 'invalid_field', 400)
  }

  // Default: last 30 days
  const now = new Date()
  const fromDate = fromParam ? new Date(fromParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const toDate = toParam ? new Date(toParam) : now

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return apiError('from and to must be valid ISO date strings', 'invalid_field', 400)
  }

  if (fromDate > toDate) {
    return apiError('from must be before to', 'invalid_field', 400)
  }

  const admin = createAdminClient()

  // Get all deployment IDs for this workspace
  const { data: deployments, error: depError } = await admin
    .from('deployments')
    .select('id, slug')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)

  if (depError) {
    console.error('Analytics deployments query error:', depError)
    return apiError('Failed to fetch analytics', 'query_failed', 500)
  }

  if (!deployments || deployments.length === 0) {
    return apiSuccess({
      metric,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      total: 0,
      deployments: [],
    })
  }

  const deploymentIds = deployments.map((d) => d.id)
  const slugMap = new Map(deployments.map((d) => [d.id, d.slug]))

  if (metric === 'views') {
    // Count analytics_events per deployment
    const { data: events, error: eventsError } = await admin
      .from('analytics_events')
      .select('deployment_id')
      .in('deployment_id', deploymentIds)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())

    if (eventsError) {
      console.error('Analytics events query error:', eventsError)
      return apiError('Failed to fetch analytics', 'query_failed', 500)
    }

    // Aggregate by deployment
    const counts = new Map<string, number>()
    for (const event of events ?? []) {
      counts.set(event.deployment_id, (counts.get(event.deployment_id) ?? 0) + 1)
    }

    let total = 0
    const perDeployment = deployments.map((d) => {
      const count = counts.get(d.id) ?? 0
      total += count
      return { deployment_id: d.id, slug: d.slug, views: count }
    })

    return apiSuccess({
      metric,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      total,
      deployments: perDeployment,
    })
  }

  // metric === 'bandwidth'
  const { data: bandwidth, error: bwError } = await admin
    .from('bandwidth_daily')
    .select('deployment_id, bytes_served, request_count')
    .in('deployment_id', deploymentIds)
    .gte('date', fromDate.toISOString().split('T')[0])
    .lte('date', toDate.toISOString().split('T')[0])

  if (bwError) {
    console.error('Bandwidth query error:', bwError)
    return apiError('Failed to fetch analytics', 'query_failed', 500)
  }

  // Aggregate by deployment
  const bwAgg = new Map<string, { bytes: number; requests: number }>()
  for (const row of bandwidth ?? []) {
    const existing = bwAgg.get(row.deployment_id) ?? { bytes: 0, requests: 0 }
    existing.bytes += row.bytes_served
    existing.requests += row.request_count
    bwAgg.set(row.deployment_id, existing)
  }

  let totalBytes = 0
  let totalRequests = 0
  const perDeployment = deployments.map((d) => {
    const agg = bwAgg.get(d.id) ?? { bytes: 0, requests: 0 }
    totalBytes += agg.bytes
    totalRequests += agg.requests
    return {
      deployment_id: d.id,
      slug: slugMap.get(d.id) ?? d.slug,
      bytes_served: agg.bytes,
      request_count: agg.requests,
    }
  })

  return apiSuccess({
    metric,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    total_bytes: totalBytes,
    total_requests: totalRequests,
    deployments: perDeployment,
  })
})
