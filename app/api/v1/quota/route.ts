import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceProfile } from '@/lib/limits/get-profile'
import { getMonthlyBandwidth } from '@/lib/limits/bandwidth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const [profile, deploymentsResult, bandwidth] = await Promise.all([
    getWorkspaceProfile(workspaceId),
    supabase
      .from('deployments')
      .select('storage_bytes')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null),
    getMonthlyBandwidth(workspaceId),
  ])

  if (deploymentsResult.error) {
    return NextResponse.json({ error: 'Failed to fetch quota' }, { status: 500 })
  }

  const deploymentCount = deploymentsResult.data.length
  const totalStorageBytes = deploymentsResult.data.reduce(
    (sum, d) => sum + (d.storage_bytes ?? 0),
    0,
  )

  return NextResponse.json({
    deployments: {
      used: deploymentCount,
      limit: profile.max_deployments ?? -1,
    },
    storage: {
      usedBytes: totalStorageBytes,
      limitBytes: profile.max_total_storage_bytes ?? -1,
    },
    bandwidth: {
      usedBytes: bandwidth.used,
      limitBytes: bandwidth.limit,
    },
  })
}
