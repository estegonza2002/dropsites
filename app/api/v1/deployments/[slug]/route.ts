import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { validateSlug, checkSlugAvailability } from '@/lib/slug/validate'
import { processUpload, UploadError } from '@/lib/upload/process'

type RouteContext = { params: Promise<{ slug: string }> }

async function resolveDeployment(slug: string, userId: string) {
  const admin = createAdminClient()
  const { data: deployment, error } = await admin
    .from('deployments')
    .select('id, slug, namespace, workspace_id, owner_id, entry_path, file_count, storage_bytes, password_hash, is_disabled, is_admin_disabled, health_status, expires_at, total_views, created_at, updated_at')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (error || !deployment) return null
  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role) return null
  return { deployment, role }
}

// GET /api/v1/deployments/[slug] — deployment detail
export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(resolved.deployment)
}

// PUT /api/v1/deployments/[slug] — overwrite deployment content
export async function PUT(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['owner', 'publisher'].includes(resolved.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing required field: file' }, { status: 400 })
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer())

  try {
    // Re-use processUpload with the existing slug to overwrite
    const result = await processUpload({
      file: buffer,
      filename: fileEntry.name,
      slug,
      workspaceId: resolved.deployment.workspace_id,
      userId: user.id,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Overwrite error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/v1/deployments/[slug] — rename slug or update settings
export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['owner', 'publisher'].includes(resolved.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const updates: Record<string, unknown> = {}
  let newSlug: string | undefined

  // Slug rename
  if (typeof body.slug === 'string' && body.slug !== slug) {
    const candidateSlug = body.slug.trim()
    const validation = validateSlug(candidateSlug)
    if (!validation.valid) {
      return NextResponse.json({ error: `Invalid slug: ${validation.errors[0]}` }, { status: 400 })
    }
    const available = await checkSlugAvailability(candidateSlug)
    if (!available) {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 409 })
    }
    updates.slug = candidateSlug
    newSlug = candidateSlug
  }

  // Boolean setting toggles (allow_indexing, auto_nav_enabled)
  if (typeof body.allow_indexing === 'boolean') updates.allow_indexing = body.allow_indexing
  if (typeof body.auto_nav_enabled === 'boolean') updates.auto_nav_enabled = body.auto_nav_enabled

  // Link expiry (ISO string or null to clear)
  if ('expires_at' in body) {
    if (body.expires_at === null) {
      updates.expires_at = null
    } else if (typeof body.expires_at === 'string') {
      const expiryDate = new Date(body.expires_at as string)
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ error: 'Invalid expires_at date' }, { status: 400 })
      }
      if (expiryDate <= new Date()) {
        return NextResponse.json({ error: 'expires_at must be a future date' }, { status: 400 })
      }
      updates.expires_at = expiryDate.toISOString()
    } else {
      return NextResponse.json({ error: 'expires_at must be an ISO date string or null' }, { status: 400 })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await admin
    .from('deployments')
    .update(updates)
    .eq('id', resolved.deployment.id)
    .select('id, slug')
    .single()

  if (updateError || !updated) {
    console.error('PATCH deployment error:', updateError)
    return NextResponse.json({ error: 'Failed to update deployment' }, { status: 500 })
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

  return NextResponse.json(updated)
}

// DELETE /api/v1/deployments/[slug] — delete deployment (soft archive)
export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only owner can delete
  if (resolved.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: only workspace owners can delete deployments' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('deployments')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', resolved.deployment.id)

    if (error) throw error

    // Audit log
    await admin.from('audit_log').insert({
      action: 'deployment.delete',
      actor_id: user.id,
      target_id: resolved.deployment.id,
      target_type: 'deployment',
      details: { slug },
    })
  } catch (err) {
    console.error('Delete deployment error:', err)
    return NextResponse.json({ error: 'Failed to delete deployment' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
