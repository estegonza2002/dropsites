import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/permissions'
import { registerEndpoint, listEndpoints } from '@/lib/webhooks/manager'

// POST /api/v1/webhooks — register a webhook endpoint
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { workspace_id: string; url: string; events: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.workspace_id || !body.url || !Array.isArray(body.events)) {
    return NextResponse.json(
      { error: 'Required fields: workspace_id, url, events' },
      { status: 400 },
    )
  }

  // Require owner or publisher role
  const role = await getUserRole(user.id, body.workspace_id)
  if (!role || role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const endpoint = await registerEndpoint(
      body.workspace_id,
      body.url,
      body.events,
    )
    return NextResponse.json(endpoint, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to register webhook'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// GET /api/v1/webhooks?workspace_id=... — list webhook endpoints
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id query parameter is required' },
      { status: 400 },
    )
  }

  const role = await getUserRole(user.id, workspaceId)
  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const endpoints = await listEndpoints(workspaceId)
    return NextResponse.json(endpoints)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list webhooks'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
