import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceProfile } from '@/lib/limits/get-profile'
import { getMonthlyBandwidth } from '@/lib/limits/bandwidth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  // Auth check
  const supabaseAuth = await createClient()
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = request.nextUrl.searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  // Permission check — must be a member of the workspace
  const role = await getUserRole(user.id, workspaceId)
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
