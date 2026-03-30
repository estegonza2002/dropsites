import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
import type { Database } from '@/lib/supabase/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export type AccessTokenRecord = Database['public']['Tables']['access_tokens']['Row']

export class TokenError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'TokenError'
  }
}

/**
 * Generate a short alphanumeric access token string.
 */
function generateTokenString(): string {
  // 12-character base62 token
  const bytes = randomBytes(9) // 9 bytes = 72 bits > 12 base62 chars
  const base62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (const byte of bytes) {
    token += base62[byte % 62]
  }
  return token
}

/**
 * Create a named access token for a deployment.
 */
export async function generateAccessToken(
  deploymentId: string,
  name: string,
  createdBy: string,
  options?: { maxViews?: number; expiresAt?: Date },
): Promise<{ tokenId: string; token: string; url: string }> {
  if (!name || name.trim().length === 0) {
    throw new TokenError('Token name is required')
  }

  if (name.length > 100) {
    throw new TokenError('Token name must be 100 characters or fewer')
  }

  const admin = createAdminClient()

  // Get deployment slug for URL
  const { data: deployment, error: depError } = await admin
    .from('deployments')
    .select('slug')
    .eq('id', deploymentId)
    .is('archived_at', null)
    .single()

  if (depError || !deployment) {
    throw new TokenError('Deployment not found', 404)
  }

  const token = generateTokenString()

  const insertData: Database['public']['Tables']['access_tokens']['Insert'] = {
    deployment_id: deploymentId,
    name: name.trim(),
    token,
    created_by: createdBy,
  }

  if (options?.maxViews != null) {
    if (options.maxViews < 1) {
      throw new TokenError('maxViews must be at least 1')
    }
    insertData.max_views = options.maxViews
  }

  if (options?.expiresAt) {
    if (options.expiresAt <= new Date()) {
      throw new TokenError('expiresAt must be a future date')
    }
    insertData.expires_at = options.expiresAt.toISOString()
  }

  const { data: tokenRecord, error } = await admin
    .from('access_tokens')
    .insert(insertData)
    .select('id')
    .single()

  if (error || !tokenRecord) {
    throw new TokenError(`Failed to create token: ${error?.message}`, 500)
  }

  const url = `${APP_URL}/${deployment.slug}?t=${token}`

  return {
    tokenId: tokenRecord.id,
    token,
    url,
  }
}

/**
 * Validate an access token for a given deployment slug.
 * Returns the token record if valid, null if invalid/expired/revoked/over-limit.
 */
export async function validateAccessToken(
  token: string,
  slug: string,
): Promise<AccessTokenRecord | null> {
  const admin = createAdminClient()

  // Join with deployments to match by slug
  const { data: deployment } = await admin
    .from('deployments')
    .select('id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment) return null

  const { data: tokenRecord } = await admin
    .from('access_tokens')
    .select('*')
    .eq('token', token)
    .eq('deployment_id', deployment.id)
    .is('revoked_at', null)
    .single()

  if (!tokenRecord) return null

  // Check expiry
  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    return null
  }

  // Check view limit
  if (tokenRecord.max_views != null && tokenRecord.view_count >= tokenRecord.max_views) {
    return null
  }

  return tokenRecord
}

/**
 * Record a view for an access token (increment view_count, update last_seen_at).
 */
export async function recordTokenView(tokenId: string): Promise<void> {
  const admin = createAdminClient()

  // Use raw SQL via RPC or do a read-then-update
  const { data: current } = await admin
    .from('access_tokens')
    .select('view_count')
    .eq('id', tokenId)
    .single()

  if (!current) return

  await admin
    .from('access_tokens')
    .update({
      view_count: current.view_count + 1,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenId)
}

/**
 * Revoke an access token.
 */
export async function revokeAccessToken(tokenId: string): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('access_tokens')
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenId)

  if (error) {
    throw new TokenError(`Failed to revoke token: ${error.message}`, 500)
  }
}

/**
 * List all access tokens for a deployment.
 */
export async function listAccessTokens(
  deploymentId: string,
): Promise<AccessTokenRecord[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('access_tokens')
    .select('*')
    .eq('deployment_id', deploymentId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new TokenError(`Failed to list tokens: ${error.message}`, 500)
  }

  return data ?? []
}

/**
 * Get a single access token by ID.
 */
export async function getAccessToken(
  tokenId: string,
): Promise<AccessTokenRecord | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('access_tokens')
    .select('*')
    .eq('id', tokenId)
    .single()

  if (error || !data) return null
  return data
}
