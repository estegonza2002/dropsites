import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

export type LimitProfile = Database['public']['Tables']['limit_profiles']['Row']

export async function getProfileByName(name: string): Promise<LimitProfile> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('limit_profiles')
    .select('*')
    .eq('name', name)
    .single()

  if (error || !data) {
    throw new Error(`Limit profile not found: ${name}`)
  }

  return data
}

/** Returns true if the given limit value means "unlimited" (−1 or null). */
export function isUnlimited(value: number | null): boolean {
  return value === null || value === -1
}
