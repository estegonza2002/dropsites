import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { ApiAuth } from '@/lib/api/auth'

// POST /api/v1/workspaces — create a new workspace
export const POST = withApiAuth(async (req: NextRequest, _ctx, auth: ApiAuth) => {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 100) {
    return apiError(
      'name is required and must be 1-100 characters',
      'invalid_field',
      400,
    )
  }

  const namespace =
    typeof body.namespace === 'string' ? body.namespace.trim().toLowerCase() : null

  if (namespace !== null) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(namespace)) {
      return apiError(
        'namespace must be 1-40 lowercase alphanumeric characters or hyphens, cannot start or end with a hyphen',
        'invalid_namespace',
        400,
      )
    }

    // Check uniqueness
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('workspaces')
      .select('id')
      .eq('namespace_slug', namespace)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      return apiError('Namespace is already taken', 'namespace_conflict', 409)
    }
  }

  const admin = createAdminClient()
  const { data: workspace, error } = await admin
    .from('workspaces')
    .insert({
      name,
      namespace_slug: namespace,
      owner_id: auth.userId,
    })
    .select('id, name, namespace_slug, owner_id, is_personal, limit_profile, created_at')
    .single()

  if (error || !workspace) {
    console.error('Create workspace error:', error)
    return apiError('Failed to create workspace', 'create_failed', 500)
  }

  // Add creator as owner member
  const { error: memberError } = await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: auth.userId,
    email: '', // Will be populated by trigger or separately
    role: 'owner',
    accepted_at: new Date().toISOString(),
  })

  if (memberError) {
    console.error('Add owner member error:', memberError)
    // Workspace was created but member add failed — still return workspace
  }

  // Audit log
  await admin.from('audit_log').insert({
    action: 'workspace.create',
    actor_id: auth.userId,
    target_id: workspace.id,
    target_type: 'workspace',
    details: { name, namespace },
  })

  return apiSuccess(workspace, 201)
})

// GET /api/v1/workspaces — list workspaces the caller is a member of
export const GET = withApiAuth(async (_req: NextRequest, _ctx, auth: ApiAuth) => {
  const admin = createAdminClient()

  // Get all workspace IDs the user is an accepted member of
  const { data: memberships, error: memberError } = await admin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', auth.userId)
    .not('accepted_at', 'is', null)

  if (memberError) {
    console.error('List memberships error:', memberError)
    return apiError('Failed to list workspaces', 'query_failed', 500)
  }

  if (!memberships || memberships.length === 0) {
    return apiSuccess([])
  }

  const workspaceIds = memberships.map((m) => m.workspace_id)
  const roleMap = new Map(memberships.map((m) => [m.workspace_id, m.role]))

  const { data: workspaces, error: wsError } = await admin
    .from('workspaces')
    .select('id, name, namespace_slug, owner_id, is_personal, limit_profile, created_at')
    .in('id', workspaceIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (wsError) {
    console.error('List workspaces error:', wsError)
    return apiError('Failed to list workspaces', 'query_failed', 500)
  }

  const result = (workspaces ?? []).map((ws) => ({
    ...ws,
    role: roleMap.get(ws.id) ?? null,
  }))

  return apiSuccess(result)
})
