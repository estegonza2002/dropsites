import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes, createHash } from 'crypto'

export interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  workspace_id: string
  user_id: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

/**
 * Generate a new API key with the `ds_` prefix.
 * Returns the full key (shown once) plus the hash for storage.
 */
export function generateApiKey(): {
  key: string
  keyHash: string
  prefix: string
} {
  const raw = randomBytes(32).toString('base64url')
  const key = `ds_${raw}`
  const keyHash = hashApiKey(key)
  // Prefix is first 8 chars after ds_ for display
  const prefix = `ds_${raw.slice(0, 8)}...`
  return { key, keyHash, prefix }
}

/**
 * SHA-256 hash of an API key for secure storage and lookup.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Validate an API key by hash lookup. Returns the key record or null.
 */
export async function validateApiKey(
  key: string,
): Promise<ApiKeyRecord | null> {
  const hash = hashApiKey(key)
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('api_keys')
    .select(
      'id, name, prefix, workspace_id, user_id, created_at, last_used_at, expires_at, revoked_at',
    )
    .eq('key_hash', hash)
    .single()

  if (error || !data) return null

  // Check revoked
  if (data.revoked_at) return null

  // Check expired
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return null
  }

  return data as ApiKeyRecord
}

/**
 * Revoke an API key by setting revoked_at.
 */
export async function revokeApiKey(
  keyId: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)

  // Audit log
  await admin.from('audit_log').insert({
    action: 'api_key.revoke',
    actor_id: userId,
    target_id: keyId,
    target_type: 'api_key',
    details: null,
  })
}

/**
 * List API keys for a workspace (never returns full key or hash).
 */
export async function listApiKeys(
  workspaceId: string,
): Promise<ApiKeyRecord[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('api_keys')
    .select(
      'id, name, prefix, workspace_id, user_id, created_at, last_used_at, expires_at, revoked_at',
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as ApiKeyRecord[]
}
