import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import {
  validateNamespace,
  checkNamespaceAvailability,
} from '@/lib/namespaces/validate'

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/v1/workspaces/[id]/namespace — set or update workspace namespace
export async function PUT(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { id: workspaceId } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only owners can set namespace
  const role = await getUserRole(user.id, workspaceId)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { namespace: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.namespace || typeof body.namespace !== 'string') {
    return NextResponse.json(
      { error: 'namespace field is required' },
      { status: 400 },
    )
  }

  const namespace = body.namespace.toLowerCase().trim()

  // Validate format
  const validation = validateNamespace(namespace)
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors[0] },
      { status: 400 },
    )
  }

  // Check availability (excluding current workspace)
  const available = await checkNamespaceAvailability(namespace, workspaceId)
  if (!available) {
    return NextResponse.json(
      { error: 'Namespace is already taken' },
      { status: 409 },
    )
  }

  const admin = createAdminClient()

  // Get old namespace for audit
  const { data: workspace } = await admin
    .from('workspaces')
    .select('namespace_slug')
    .eq('id', workspaceId)
    .single()

  const { error: updateError } = await admin
    .from('workspaces')
    .update({ namespace_slug: namespace })
    .eq('id', workspaceId)

  if (updateError) {
    console.error('Set namespace error:', updateError)
    return NextResponse.json(
      { error: 'Failed to set namespace' },
      { status: 500 },
    )
  }

  // Update all deployments in this workspace to use the new namespace
  await admin
    .from('deployments')
    .update({ namespace })
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)

  // Audit log
  await admin.from('audit_log').insert({
    action: 'workspace.namespace_updated',
    actor_id: user.id,
    target_id: workspaceId,
    target_type: 'workspace',
    details: {
      old_namespace: workspace?.namespace_slug ?? null,
      new_namespace: namespace,
    },
  })

  return NextResponse.json({
    namespace,
    url_pattern: `~${namespace}/{slug}`,
  })
}

// DELETE /api/v1/workspaces/[id]/namespace — remove namespace
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { id: workspaceId } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, workspaceId)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Get current namespace for audit
  const { data: workspace } = await admin
    .from('workspaces')
    .select('namespace_slug')
    .eq('id', workspaceId)
    .single()

  if (!workspace?.namespace_slug) {
    return NextResponse.json(
      { error: 'Workspace does not have a namespace' },
      { status: 400 },
    )
  }

  const { error } = await admin
    .from('workspaces')
    .update({ namespace_slug: null })
    .eq('id', workspaceId)

  if (error) {
    console.error('Remove namespace error:', error)
    return NextResponse.json(
      { error: 'Failed to remove namespace' },
      { status: 500 },
    )
  }

  // Clear namespace from all deployments
  await admin
    .from('deployments')
    .update({ namespace: null })
    .eq('workspace_id', workspaceId)

  // Audit log
  await admin.from('audit_log').insert({
    action: 'workspace.namespace_removed',
    actor_id: user.id,
    target_id: workspaceId,
    target_type: 'workspace',
    details: {
      removed_namespace: workspace.namespace_slug,
    },
  })

  return new NextResponse(null, { status: 204 })
}
