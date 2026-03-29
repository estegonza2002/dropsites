import { createAdminClient } from '@/lib/supabase/admin'

export interface SlugRedirectResult {
  newSlug: string
}

/**
 * Check if a slug has a redirect entry (from renaming).
 * Returns the new slug if a valid redirect exists, null otherwise.
 */
export async function checkSlugRedirect(
  slug: string,
  namespace?: string | null,
): Promise<string | null> {
  const admin = createAdminClient()

  let query = admin
    .from('slug_redirects')
    .select('new_slug')
    .eq('old_slug', slug)
    .gte('expires_at', new Date().toISOString())

  if (namespace) {
    query = query.eq('old_namespace', namespace)
  }

  const { data } = await query.limit(1).maybeSingle()

  return data?.new_slug ?? null
}

/**
 * Resolve a slug redirect for use in middleware.
 * Returns a typed result or null if no redirect exists.
 */
export async function resolveSlugRedirect(
  slug: string,
  namespace?: string | null,
): Promise<SlugRedirectResult | null> {
  const newSlug = await checkSlugRedirect(slug, namespace)
  if (!newSlug) return null
  return { newSlug }
}
