import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureAvailable, requiresProfile } from '@/lib/billing/feature-gates'

// GET /api/v1/billing/feature-check?feature=<name>&workspaceId=<id>
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const feature = url.searchParams.get('feature')
  const workspaceId = url.searchParams.get('workspaceId')

  if (!feature || !workspaceId) {
    return NextResponse.json(
      { error: 'feature and workspaceId query parameters are required' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const available = await isFeatureAvailable(workspaceId, feature)
  const requiredPlan = requiresProfile(feature)

  return NextResponse.json({ feature, available, required_plan: requiredPlan })
}
