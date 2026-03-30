import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ApiAuth {
  userId: string
  workspaceId: string
  method: 'session' | 'api_key'
  /** API key ID — only set when method === 'api_key' */
  apiKeyId?: string
}

/**
 * Authenticate an API request. Checks Bearer token first, then falls back
 * to session cookie auth.
 *
 * For Bearer auth, validates against the api_keys table (hash lookup),
 * checks revoked/expired, and updates last_used_at.
 *
 * Returns null if authentication fails.
 */
export async function authenticateRequest(
  req: Request,
): Promise<ApiAuth | null> {
  const authHeader = req.headers.get('authorization')

  // Try Bearer token first
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token.startsWith('ds_')) {
      return authenticateApiKey(token)
    }
  }

  // Fall back to session cookie
  return authenticateSession()
}

// ── Session auth ───────────────────────────────────────────────

async function authenticateSession(): Promise<ApiAuth | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  // Resolve first accepted workspace
  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .limit(1)
    .single()

  if (!membership) return null

  return {
    userId: user.id,
    workspaceId: membership.workspace_id,
    method: 'session',
  }
}

// ── API key auth ───────────────────────────────────────────────

async function authenticateApiKey(key: string): Promise<ApiAuth | null> {
  // Dynamic import to avoid circular dependency during initial load
  const { hashApiKey } = await import('./keys')

  const hash = hashApiKey(key)
  const admin = createAdminClient()

  const { data: apiKey, error } = await admin
    .from('api_keys')
    .select('id, workspace_id, user_id, revoked_at, expires_at')
    .eq('key_hash', hash)
    .single()

  if (error || !apiKey) return null

  // Check revoked
  if (apiKey.revoked_at) return null

  // Check expired
  if (apiKey.expires_at && new Date(apiKey.expires_at) <= new Date()) {
    return null
  }

  // Update last_used_at (fire-and-forget)
  admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then(() => {
      /* intentionally ignored */
    })

  return {
    userId: apiKey.user_id,
    workspaceId: apiKey.workspace_id,
    method: 'api_key',
    apiKeyId: apiKey.id,
  }
}
