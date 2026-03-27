import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export function computeHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export async function checkBlockedHash(hash: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('content_hashes')
    .select('blocked')
    .eq('sha256_hash', hash)
    .single()

  if (error || !data) return false
  return data.blocked === true
}
