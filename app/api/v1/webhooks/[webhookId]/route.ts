import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import {
  deleteEndpoint,
  testEndpoint,
  getDeliveryLog,
} from '@/lib/webhooks/manager'

type RouteContext = { params: Promise<{ webhookId: string }> }

/**
 * Resolve webhook endpoint and verify the caller has access to its workspace.
 */
async function resolveEndpoint(webhookId: string, userId: string) {
  const admin = createAdminClient()
  const { data: endpoint } = await admin
    .from('webhook_endpoints')
    .select('id, workspace_id')
    .eq('id', webhookId)
    .single()

  if (!endpoint) return null

  const role = await getUserRole(userId, endpoint.workspace_id)
  if (!role || role === 'viewer') return null

  return endpoint
}

// DELETE /api/v1/webhooks/[webhookId] — remove endpoint
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { webhookId } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const endpoint = await resolveEndpoint(webhookId, user.id)
  if (!endpoint) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await deleteEndpoint(webhookId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete webhook'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/v1/webhooks/[webhookId] — send test event
export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { webhookId } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const endpoint = await resolveEndpoint(webhookId, user.id)
  if (!endpoint) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Determine action from query param
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'test') {
    try {
      const result = await testEndpoint(webhookId)
      return NextResponse.json(result)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Test delivery failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// GET /api/v1/webhooks/[webhookId]?include=deliveries — delivery log
export async function GET(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { webhookId } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const endpoint = await resolveEndpoint(webhookId, user.id)
  if (!endpoint) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const include = req.nextUrl.searchParams.get('include')

  if (include === 'deliveries') {
    try {
      const deliveries = await getDeliveryLog(webhookId)
      return NextResponse.json(deliveries)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch deliveries'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // Return endpoint info
  const admin = createAdminClient()
  const { data } = await admin
    .from('webhook_endpoints')
    .select('*')
    .eq('id', webhookId)
    .single()

  return NextResponse.json(data)
}
