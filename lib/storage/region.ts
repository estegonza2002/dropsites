import { createAdminClient } from '@/lib/supabase/admin'

export type DataRegion = 'us' | 'eu'

const REGION_BUCKETS: Record<DataRegion, string> = {
  us: process.env.R2_BUCKET_US ?? 'dropsites-us',
  eu: process.env.R2_BUCKET_EU ?? 'dropsites-eu',
}

/**
 * Looks up the data_region configured for a workspace.
 * Falls back to 'us' if no region is set or workspace is not found.
 */
export async function getStorageRegion(workspaceId: string): Promise<DataRegion> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workspaces')
    .select('data_region')
    .eq('id', workspaceId)
    .single()

  if (error || !data) {
    return 'us'
  }

  const region = data.data_region
  if (region === 'eu' || region === 'us') {
    return region
  }

  return 'us'
}

/**
 * Returns the bucket name for a given data region.
 */
export function getRegionBucket(region: DataRegion): string {
  return REGION_BUCKETS[region]
}
