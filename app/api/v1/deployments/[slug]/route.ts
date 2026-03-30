import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { validateSlug, checkSlugAvailability } from '@/lib/slug/validate'
import { processUpload, UploadError } from '@/lib/upload/process'
import { dispatchWebhooksForWorkspace } from '@/lib/webhooks/dispatch'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { ApiAuth } from '@/lib/api/auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function resolveDeployment(slug: string, userId: string) {
  const admin = createAdminClient()
  const { data: deployment, error } = await admin
    .from('deployments')
    .select(
      'id, slug, namespace, workspace_id, owner_id, entry_path, file_count, storage_bytes, password_hash, is_disabled, is_admin_disabled, health_status, allow_indexing, auto_nav_enabled, expires_at, total_views, created_at, updated_at, archived_at',
    )
    .eq('slug', slug)
    .single()

  if (error || !deployment) return null

  // For archived deployments, return 410
  if (deployment.archived_at) return { deployment, role: null as string | null, gone: true }

  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role) return null
  return { deployment, role, gone: false }
}

// GET /api/v1/deployments/[slug] — deployment detail
export const GET = withApiAuth(async (_req: NextRequest, ctx, auth: ApiAuth) => {
  const { slug } = await ctx.params
  const resolved = await resolveDeployment(slug, auth.userId)

  if (!resolved) return apiError('Not found', 'not_found', 404)
  if (resolved.gone) return apiError('Deployment has been deleted', 'gone', 410)

  const { archived_at: _archived, password_hash: _pw, ...safe } = resolved.deployment
  return apiSuccess(safe)
})

// PUT /api/v1/deployments/[slug] — overwrite deployment content
export const PUT = withApiAuth(async (req: NextRequest, ctx, auth: ApiAuth) => {
  const { slug } = await ctx.params
  const resolved = await resolveDeployment(slug, auth.userId)

  if (!resolved) return apiError('Not found', 'not_found', 404)
  if (resolved.gone) return apiError('Deployment has been deleted', 'gone', 410)
  if (!resolved.role || !['owner', 'publisher'].includes(resolved.role)) {
    return apiError('Forbidden', 'forbidden', 403)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return apiError('Invalid multipart form data', 'invalid_body', 400)
  }

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof File)) {
    return apiError('Missing required field: file', 'missing_field', 400)
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer())

  try {
    const result = await processUpload({
      file: buffer,
      filename: fileEntry.name,
      slug,
      workspaceId: resolved.deployment.workspace_id,
      userId: auth.userId,
    })

    // Fire webhook (non-blocking)
    dispatchWebhooksForWorkspace(resolved.deployment.workspace_id, {
      event: 'deployment.updated',
      slug,
      url: `${APP_URL}/${slug}`,
      timestamp: new Date().toISOString(),
      actor: auth.userId,
      deployment: {
        id: resolved.deployment.id,
        name: slug,
        version: null,
      },
    }).catch(() => {})

    return apiSuccess(result)
  } catch (err) {
    if (err instanceof UploadError) {
      return apiError(err.message, 'upload_error', err.status)
    }
    console.error('Overwrite error:', err)
    return apiError('Internal server error', 'internal_error', 500)
  }
})

// PATCH /api/v1/deployments/[slug] — update deployment metadata
export const PATCH = withApiAuth(async (req: NextRequest, ctx, auth: ApiAuth) => {
  const { slug } = await ctx.params
  const resolved = await resolveDeployment(slug, auth.userId)

  if (!resolved) return apiError('Not found', 'not_found', 404)
  if (resolved.gone) return apiError('Deployment has been deleted', 'gone', 410)
  if (!resolved.role || !['owner', 'publisher'].includes(resolved.role)) {
    return apiError('Forbidden', 'forbidden', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const admin = createAdminClient()
  const updates: Record<string, unknown> = {}
  let newSlug: string | undefined

  // Slug rename
  if (typeof body.slug === 'string' && body.slug !== slug) {
    const candidateSlug = body.slug.trim()
    const validation = validateSlug(candidateSlug)
    if (!validation.valid) {
      return apiError(`Invalid slug: ${validation.errors[0]}`, 'invalid_slug', 400)
    }
    const available = await checkSlugAvailability(candidateSlug)
    if (!available) {
      return apiError('Slug is already taken', 'slug_conflict', 409)
    }
    updates.slug = candidateSlug
    newSlug = candidateSlug
  }

  // Boolean toggles
  if (typeof body.allow_indexing === 'boolean') updates.allow_indexing = body.allow_indexing
  if (typeof body.auto_nav_enabled === 'boolean') updates.auto_nav_enabled = body.auto_nav_enabled

  // Link expiry
  if ('expires_at' in body) {
    if (body.expires_at === null) {
      updates.expires_at = null
    } else if (typeof body.expires_at === 'string') {
      const expiryDate = new Date(body.expires_at as string)
      if (isNaN(expiryDate.getTime())) {
        return apiError('Invalid expires_at date', 'invalid_field', 400)
      }
      if (expiryDate <= new Date()) {
        return apiError('expires_at must be a future date', 'invalid_field', 400)
      }
      updates.expires_at = expiryDate.toISOString()
    } else {
      return apiError('expires_at must be an ISO date string or null', 'invalid_field', 400)
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 'no_changes', 400)
  }

  const { data: updated, error: updateError } = await admin
    .from('deployments')
    .update(updates)
    .eq('id', resolved.deployment.id)
    .select('id, slug, allow_indexing, auto_nav_enabled, expires_at, updated_at')
    .single()

  if (updateError || !updated) {
    console.error('PATCH deployment error:', updateError)
    return apiError('Failed to update deployment', 'update_failed', 500)
  }

  // Create slug redirect when slug changes (90-day expiry)
  if (newSlug) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    await admin.from('slug_redirects').upsert(
      {
        old_slug: slug,
        old_namespace: resolved.deployment.namespace,
        new_slug: newSlug,
        new_namespace: resolved.deployment.namespace,
        deployment_id: resolved.deployment.id,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'old_slug,old_namespace' },
    )
  }

  // Fire webhook (non-blocking)
  dispatchWebhooksForWorkspace(resolved.deployment.workspace_id, {
    event: 'deployment.updated',
    slug: newSlug ?? slug,
    url: `${APP_URL}/${newSlug ?? slug}`,
    timestamp: new Date().toISOString(),
    actor: auth.userId,
    deployment: {
      id: resolved.deployment.id,
      name: newSlug ?? slug,
      version: null,
    },
  }).catch(() => {})

  return apiSuccess(updated)
})

// DELETE /api/v1/deployments/[slug] — soft-delete (archive)
export const DELETE = withApiAuth(async (_req: NextRequest, ctx, auth: ApiAuth) => {
  const { slug } = await ctx.params
  const resolved = await resolveDeployment(slug, auth.userId)

  if (!resolved) return apiError('Not found', 'not_found', 404)
  if (resolved.gone) return apiError('Deployment has been deleted', 'gone', 410)

  if (resolved.role !== 'owner') {
    return apiError('Only workspace owners can delete deployments', 'forbidden', 403)
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('deployments')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', resolved.deployment.id)

    if (error) throw error

    await admin.from('audit_log').insert({
      action: 'deployment.delete',
      actor_id: auth.userId,
      target_id: resolved.deployment.id,
      target_type: 'deployment',
      details: { slug },
    })

    // Fire webhook (non-blocking)
    dispatchWebhooksForWorkspace(resolved.deployment.workspace_id, {
      event: 'deployment.deleted',
      slug,
      url: `${APP_URL}/${slug}`,
      timestamp: new Date().toISOString(),
      actor: auth.userId,
      deployment: {
        id: resolved.deployment.id,
        name: slug,
        version: null,
      },
    }).catch(() => {})
  } catch (err) {
    console.error('Delete deployment error:', err)
    return apiError('Failed to delete deployment', 'delete_failed', 500)
  }

  return new Response(null, { status: 204 }) as unknown as import('next/server').NextResponse
})
