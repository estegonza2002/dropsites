import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/v1/workspaces/[id]
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: workspace } = await admin
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ workspace, role })
}

// PATCH /api/v1/workspaces/[id] — update workspace settings
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can update workspace settings' }, { status: 403 })
  }

  let body: { name?: string; namespace_slug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name || name.length < 2 || name.length > 128) {
      return NextResponse.json({ error: 'Name must be between 2 and 128 characters' }, { status: 400 })
    }
    updates.name = name
  }

  if (body.namespace_slug !== undefined) {
    const slug = body.namespace_slug?.trim().toLowerCase() || null
    if (slug && !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) {
      return NextResponse.json(
        { error: 'Namespace must be lowercase alphanumeric with hyphens, 2-64 characters' },
        { status: 400 },
      )
    }
    // Check uniqueness
    if (slug) {
      const admin = createAdminClient()
      const { data: existing } = await admin
        .from('workspaces')
        .select('id')
        .eq('namespace_slug', slug)
        .is('deleted_at', null)
        .neq('id', id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Namespace already taken' }, { status: 409 })
      }
    }
    updates.namespace_slug = slug
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  updates.updated_at = new Date().toISOString()

  const { data: workspace, error } = await admin
    .from('workspaces')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, name, namespace_slug, is_personal, owner_id, limit_profile, created_at, updated_at')
    .single()

  if (error) {
    console.error('Update workspace error:', error)
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 })
  }

  return NextResponse.json({ workspace })
}

// DELETE /api/v1/workspaces/[id] — soft-delete workspace
export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can delete workspaces' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Prevent deleting personal workspace
  const { data: ws } = await admin.from('workspaces').select('is_personal').eq('id', id).single()
  if (ws?.is_personal) {
    return NextResponse.json({ error: 'Cannot delete personal workspace' }, { status: 400 })
  }

  // Soft-delete: set deleted_at
  const { error } = await admin
    .from('workspaces')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Delete workspace error:', error)
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
