import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { generateApiKey, listApiKeys } from '@/lib/api/keys'

// POST /api/v1/api-keys — generate a new API key
export const POST = withApiAuth(async (req: NextRequest, _ctx, auth) => {
  let body: { name?: string; expires_at?: string | null }
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 100) {
    return apiError('Key name is required (max 100 chars)', 'invalid_field', 400)
  }

  // Validate optional expiry
  let expiresAt: string | null = null
  if (body.expires_at && typeof body.expires_at === 'string') {
    const date = new Date(body.expires_at)
    if (isNaN(date.getTime()) || date <= new Date()) {
      return apiError('expires_at must be a future ISO date', 'invalid_field', 400)
    }
    expiresAt = date.toISOString()
  }

  const { key, keyHash, prefix } = generateApiKey()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('api_keys')
    .insert({
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      name,
      prefix,
      key_hash: keyHash,
      expires_at: expiresAt,
    })
    .select('id, name, prefix, created_at, expires_at')
    .single()

  if (error || !data) {
    console.error('Create API key error:', error)
    return apiError('Failed to create API key', 'create_failed', 500)
  }

  // Audit log
  await admin.from('audit_log').insert({
    action: 'api_key.create',
    actor_id: auth.userId,
    target_id: data.id,
    target_type: 'api_key',
    details: { name, prefix },
  })

  // Return the full key ONCE
  return apiSuccess(
    {
      id: data.id,
      name: data.name,
      key, // Full key — shown only this one time
      prefix: data.prefix,
      created_at: data.created_at,
      expires_at: data.expires_at,
    },
    201,
  )
})

// GET /api/v1/api-keys — list all keys for the workspace
export const GET = withApiAuth(async (_req: NextRequest, _ctx, auth) => {
  const keys = await listApiKeys(auth.workspaceId)
  return apiSuccess(keys)
})
