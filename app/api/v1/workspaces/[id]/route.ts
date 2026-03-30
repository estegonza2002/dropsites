import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { ApiAuth } from '@/lib/api/auth'

async function resolveWorkspace(workspaceId: string, userId: string) {
  const admin = createAdminClient()
  const { data: workspace, error } = await admin
    .from('workspaces')
    .select(
      'id, name, namespace_slug, owner_id, is_personal, limit_profile, trial_started_at, trial_ends_at, created_at, updated_at, deleted_at',
    )
    .eq('id', workspaceId)
    .single()

  if (error || !workspace) return null
  if (workspace.deleted_at) return { workspace, role: null as string | null, gone: true }

  const role = await getUserRole(userId, workspaceId)
  if (!role) return null
  return { workspace, role, gone: false }
}

// GET /api/v1/workspaces/[id] — workspace detail
export const GET = withApiAuth(async (_req: NextRequest, ctx, auth: ApiAuth) => {
  const { id } = await ctx.params
  const resolved = await resolveWorkspace(id, auth.userId)

  if (!resolved) return apiError('Not found', 'not_found', 404)
  if (resolved.gone) return apiError('Workspace has been deleted', 'gone', 410)

  const admin = createAdminClient()

  // Get member count
  const { count } = await admin
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', id)
    .not('accepted_at', 'is', null)

  const { deleted_at: _deleted, ...safe } = resolved.workspace
  return apiSuccess({
    ...safe,
    member_count: count ?? 0,
    role: resolved.role,
  })
})

// PATCH /api/v1/workspaces/[id] — update workspace settings (owner only)
export const PATCH = withApiAuth(async (req: NextRequest, ctx, auth: ApiAuth) => {
  const { id } = await ctx.params
  const resolved = await resolveWorkspace(id, auth.userId)

  if (!resolved) return apiError('Not found', 'not_found', 404)
  if (resolved.gone) return apiError('Workspace has been deleted', 'gone', 410)
  if (resolved.role !== 'owner') {
    return apiError('Only workspace owners can update settings', 'forbidden', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const admin = createAdminClient()
  const updates: Record<string, unknown> = {}

  // Name
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name || name.length > 100) {
      return apiError('name must be 1-100 characters', 'invalid_field', 400)
    }
    updates.name = name
  }

  // Data region
  if ('data_region' in body) {
    const validRegions = ['us', 'eu']
    if (typeof body.data_region !== 'string' || !validRegions.includes(body.data_region)) {
      return apiError(`data_region must be one of: ${validRegions.join(', ')}`, 'invalid_field', 400)
    }
    updates.data_region = body.data_region
  }

  // Namespace
  if ('namespace' in body) {
    if (body.namespace === null) {
      updates.namespace_slug = null
    } else if (typeof body.namespace === 'string') {
      const namespace = body.namespace.trim().toLowerCase()
      if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(namespace)) {
        return apiError(
          'namespace must be 1-40 lowercase alphanumeric characters or hyphens',
          'invalid_namespace',
          400,
        )
      }

      // Check uniqueness (excluding current workspace)
      const { data: existing } = await admin
        .from('workspaces')
        .select('id')
        .eq('namespace_slug', namespace)
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (existing) {
        return apiError('Namespace is already taken', 'namespace_conflict', 409)
      }
      updates.namespace_slug = namespace
    } else {
      return apiError('namespace must be a string or null', 'invalid_field', 400)
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 'no_changes', 400)
  }

  updates.updated_at = new Date().toISOString()

  const { data: updated, error: updateError } = await admin
    .from('workspaces')
    .update(updates)
    .eq('id', id)
    .select('id, name, namespace_slug, owner_id, is_personal, limit_profile, data_region, updated_at')
    .single()

  if (updateError || !updated) {
    console.error('PATCH workspace error:', updateError)
    return apiError('Failed to update workspace', 'update_failed', 500)
  }

  await admin.from('audit_log').insert({
    action: 'workspace.update',
    actor_id: auth.userId,
    target_id: id,
    target_type: 'workspace',
    details: updates,
  })

  return apiSuccess(updated)
})

// DELETE /api/v1/workspaces/[id] — soft-delete workspace (owner only)
export const DELETE = withApiAuth(async (_req: NextRequest, ctx, auth: ApiAuth) => {
  const { id } = await ctx.params
  const resolved = await resolveWorkspace(id, auth.userId)

  if (!resolved) return apiError('Not found', 'not_found', 404)
  if (resolved.gone) return apiError('Workspace has been deleted', 'gone', 410)
  if (resolved.role !== 'owner') {
    return apiError('Only workspace owners can delete workspaces', 'forbidden', 403)
  }

  // Prevent deleting personal workspace
  if (resolved.workspace.is_personal) {
    return apiError('Cannot delete personal workspace', 'cannot_delete_personal', 400)
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('workspaces')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Delete workspace error:', error)
    return apiError('Failed to delete workspace', 'delete_failed', 500)
  }

  await admin.from('audit_log').insert({
    action: 'workspace.delete',
    actor_id: auth.userId,
    target_id: id,
    target_type: 'workspace',
    details: { name: resolved.workspace.name },
  })

  return new Response(null, { status: 204 }) as unknown as import('next/server').NextResponse
})
