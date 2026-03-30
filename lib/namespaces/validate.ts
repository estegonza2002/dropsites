import { createAdminClient } from '@/lib/supabase/admin'

const MIN_NAMESPACE_LENGTH = 3
const MAX_NAMESPACE_LENGTH = 32
const NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
const CONSECUTIVE_HYPHENS = /--/

/** Reserved namespace slugs that cannot be claimed by workspaces. */
const RESERVED_NAMESPACES = new Set([
  'api',
  'app',
  'admin',
  'auth',
  'dashboard',
  'docs',
  'help',
  'login',
  'signup',
  'settings',
  'status',
  'support',
  'www',
  'mail',
  'blog',
  'cdn',
  'static',
  'assets',
  'dropsites',
  'system',
  'public',
  'private',
  'team',
  'teams',
  'org',
  'user',
  'users',
  'invite',
  'pricing',
  'billing',
  'changelog',
])

export interface NamespaceValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a namespace string against format rules.
 */
export function validateNamespace(namespace: string): NamespaceValidationResult {
  const errors: string[] = []

  if (namespace.length < MIN_NAMESPACE_LENGTH) {
    errors.push(
      `Namespace must be at least ${MIN_NAMESPACE_LENGTH} characters`,
    )
  }

  if (namespace.length > MAX_NAMESPACE_LENGTH) {
    errors.push(
      `Namespace must be at most ${MAX_NAMESPACE_LENGTH} characters`,
    )
  }

  if (!/^[a-z0-9-]+$/.test(namespace)) {
    errors.push(
      'Namespace may only contain lowercase letters, numbers, and hyphens',
    )
  }

  if (namespace.length >= 2 && !NAMESPACE_PATTERN.test(namespace)) {
    errors.push('Namespace must not start or end with a hyphen')
  }

  if (CONSECUTIVE_HYPHENS.test(namespace)) {
    errors.push('Namespace must not contain consecutive hyphens')
  }

  if (RESERVED_NAMESPACES.has(namespace)) {
    errors.push('Namespace is reserved and cannot be used')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Check whether a namespace is available (not already claimed by another workspace).
 */
export async function checkNamespaceAvailability(
  namespace: string,
  excludeWorkspaceId?: string,
): Promise<boolean> {
  const supabase = createAdminClient()

  let query = supabase
    .from('workspaces')
    .select('id')
    .eq('namespace_slug', namespace)
    .is('deleted_at', null)
    .limit(1)

  if (excludeWorkspaceId) {
    query = query.neq('id', excludeWorkspaceId)
  }

  const { data, error } = await query

  if (error) throw error

  return !data || data.length === 0
}
