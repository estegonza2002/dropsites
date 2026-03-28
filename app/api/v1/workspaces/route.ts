import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/v1/workspaces — create a new workspace
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; namespace_slug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name || name.length < 2 || name.length > 128) {
    return NextResponse.json(
      { error: 'Name must be between 2 and 128 characters' },
      { status: 400 },
    )
  }

  const namespaceSlug = body.namespace_slug?.trim().toLowerCase() || null
  if (namespaceSlug && !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(namespaceSlug)) {
    return NextResponse.json(
      { error: 'Namespace must be lowercase alphanumeric with hyphens, 2-64 characters' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // Check namespace uniqueness if provided
  if (namespaceSlug) {
    const { data: existing } = await admin
      .from('workspaces')
      .select('id')
      .eq('namespace_slug', namespaceSlug)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Namespace already taken' }, { status: 409 })
    }
  }

  // Create workspace
  const { data: workspace, error: createError } = await admin
    .from('workspaces')
    .insert({
      name,
      namespace_slug: namespaceSlug,
      owner_id: user.id,
      is_personal: false,
    })
    .select('id, name, namespace_slug, is_personal, owner_id, limit_profile, created_at, updated_at')
    .single()

  if (createError) {
    console.error('Create workspace error:', createError)
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
  }

  // Add creator as owner member
  const { error: memberError } = await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    email: user.email!,
    role: 'owner',
    accepted_at: new Date().toISOString(),
  })

  if (memberError) {
    console.error('Add owner member error:', memberError)
    // Rollback workspace
    await admin.from('workspaces').delete().eq('id', workspace.id)
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
  }

  return NextResponse.json({ workspace }, { status: 201 })
}

// GET /api/v1/workspaces — list workspaces for authenticated user
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  if (workspaceIds.length === 0) {
    return NextResponse.json({ workspaces: [] })
  }

  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id, name, namespace_slug, is_personal, owner_id, limit_profile, created_at, updated_at')
    .in('id', workspaceIds)
    .is('deleted_at', null)
    .order('is_personal', { ascending: false })
    .order('created_at', { ascending: true })

  // Attach role to each workspace
  const roleMap = new Map((memberships ?? []).map((m) => [m.workspace_id, m.role]))
  const enriched = (workspaces ?? []).map((ws) => ({
    ...ws,
    role: roleMap.get(ws.id) ?? 'viewer',
  }))

  return NextResponse.json({ workspaces: enriched })
}
