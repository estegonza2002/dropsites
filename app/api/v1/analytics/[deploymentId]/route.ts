import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import {
  getViewStats,
  getTopReferrers,
  getTimeSeriesViews,
  type DateRange,
} from '@/lib/analytics/query'

type RouteContext = { params: Promise<{ deploymentId: string }> }

const VALID_RANGES = new Set(['7d', '30d', '90d'])

// GET /api/v1/analytics/[deploymentId]
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { deploymentId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify membership
  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('workspace_id')
    .eq('id', deploymentId)
    .single()

  if (!deployment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rangeParam = request.nextUrl.searchParams.get('range') ?? '7d'
  const range: DateRange = VALID_RANGES.has(rangeParam) ? (rangeParam as DateRange) : '7d'

  const [stats, referrers, timeSeries] = await Promise.all([
    getViewStats(deploymentId, range),
    getTopReferrers(deploymentId, range),
    getTimeSeriesViews(deploymentId, range),
  ])

  return NextResponse.json({ stats, referrers, timeSeries })
}
