import { MIN_SLUG_LENGTH, MAX_SLUG_LENGTH } from '@/lib/config/constants'
import { isReservedSlug } from '@/lib/slug/reserved'
import { createClient } from '@/lib/supabase/server'

const CONSECUTIVE_HYPHENS = /--/

export interface SlugValidationResult {
  valid: boolean
  errors: string[]
}

export function validateSlug(slug: string): SlugValidationResult {
  const errors: string[] = []

  if (slug.length < MIN_SLUG_LENGTH) {
    errors.push(`Slug must be at least ${MIN_SLUG_LENGTH} characters`)
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    errors.push(`Slug must be at most ${MAX_SLUG_LENGTH} characters`)
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug may only contain lowercase letters, numbers, and hyphens')
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    errors.push('Slug must not start or end with a hyphen')
  }

  if (CONSECUTIVE_HYPHENS.test(slug)) {
    errors.push('Slug must not contain consecutive hyphens')
  }

  if (isReservedSlug(slug)) {
    errors.push('Slug is reserved and cannot be used')
  }

  return { valid: errors.length === 0, errors }
}

export async function checkSlugAvailability(
  slug: string,
  namespace?: string,
): Promise<boolean> {
  const supabase = await createClient()

  let query = supabase
    .from('deployments')
    .select('id')
    .eq('slug', slug)
    .limit(1)

  if (namespace) {
    query = query.eq('namespace', namespace)
  }

  const { data, error } = await query

  if (error) throw error

  return !data || data.length === 0
}
