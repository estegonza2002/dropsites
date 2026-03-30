import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

// GET /api/v1/workspaces/[id]/activity — recent audit log entries for a workspace
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: workspaceId } = await ctx.params

  const role = await getUserRole(user.id, workspaceId)
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const limitParam = url.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10), 1), 200)

  const admin = createAdminClient()

  // Query audit log entries that belong to this workspace
  const { data: entries, error } = await admin
    .from('audit_log')
    .select('id, action, actor_id, target_id, target_type, details, created_at')
    .eq('target_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Activity feed query error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }

  // Enrich with actor display names where available
  const actorIds = [
    ...new Set((entries ?? []).map((e) => e.actor_id).filter(Boolean) as string[]),
  ]

  const actorMap = new Map<string, string>()
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from('users')
      .select('id, display_name, email')
      .in('id', actorIds)

    for (const actor of actors ?? []) {
      actorMap.set(actor.id, actor.display_name ?? actor.email)
    }
  }

  const activity = (entries ?? []).map((entry) => ({
    id: entry.id,
    action: entry.action,
    actor_id: entry.actor_id,
    actor_name: entry.actor_id ? (actorMap.get(entry.actor_id) ?? null) : null,
    target_id: entry.target_id,
    target_type: entry.target_type,
    details: entry.details,
    occurred_at: entry.created_at,
  }))

  return NextResponse.json({ activity, total: activity.length })
}
