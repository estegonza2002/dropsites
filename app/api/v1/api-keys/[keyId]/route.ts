import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { revokeApiKey } from '@/lib/api/keys'

// DELETE /api/v1/api-keys/[keyId] — revoke a key
export const DELETE = withApiAuth(async (_req: NextRequest, ctx, auth) => {
  const { keyId } = await ctx.params

  const admin = createAdminClient()
  const { data: apiKey, error } = await admin
    .from('api_keys')
    .select('id, workspace_id')
    .eq('id', keyId)
    .single()

  if (error || !apiKey) {
    return apiError('API key not found', 'not_found', 404)
  }

  if (apiKey.workspace_id !== auth.workspaceId) {
    return apiError('Forbidden', 'forbidden', 403)
  }

  await revokeApiKey(keyId, auth.userId)

  return new Response(null, { status: 204 }) as unknown as import('next/server').NextResponse
})

// PATCH /api/v1/api-keys/[keyId] — update key name or expiry
export const PATCH = withApiAuth(async (req: NextRequest, ctx, auth) => {
  const { keyId } = await ctx.params

  const admin = createAdminClient()
  const { data: apiKey, error: fetchError } = await admin
    .from('api_keys')
    .select('id, workspace_id, revoked_at')
    .eq('id', keyId)
    .single()

  if (fetchError || !apiKey) {
    return apiError('API key not found', 'not_found', 404)
  }

  if (apiKey.workspace_id !== auth.workspaceId) {
    return apiError('Forbidden', 'forbidden', 403)
  }

  if (apiKey.revoked_at) {
    return apiError('Cannot update a revoked key', 'key_revoked', 400)
  }

  let body: { name?: string; expires_at?: string | null }
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name || name.length > 100) {
      return apiError('Key name is required (max 100 chars)', 'invalid_field', 400)
    }
    updates.name = name
  }

  if ('expires_at' in body) {
    if (body.expires_at === null) {
      updates.expires_at = null
    } else if (typeof body.expires_at === 'string') {
      const date = new Date(body.expires_at)
      if (isNaN(date.getTime()) || date <= new Date()) {
        return apiError('expires_at must be a future ISO date', 'invalid_field', 400)
      }
      updates.expires_at = date.toISOString()
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 'no_changes', 400)
  }

  const { data: updated, error: updateError } = await admin
    .from('api_keys')
    .update(updates)
    .eq('id', keyId)
    .select('id, name, prefix, created_at, last_used_at, expires_at, revoked_at')
    .single()

  if (updateError || !updated) {
    return apiError('Failed to update API key', 'update_failed', 500)
  }

  return apiSuccess(updated)
})
