import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

export type Deployment = Database['public']['Tables']['deployments']['Row']
export type DeploymentFile = Database['public']['Tables']['deployment_files']['Row']

export async function resolveDeployment(
  slug: string,
  namespace?: string,
): Promise<Deployment | null> {
  const supabase = createAdminClient()

  let query = supabase
    .from('deployments')
    .select('*')
    .eq('slug', slug)
    .is('archived_at', null)

  if (namespace) {
    query = query.eq('namespace', namespace)
  }

  const { data, error } = await query.limit(1).single()

  if (error || !data) return null
  return data
}

export async function resolveFile(
  deploymentId: string,
  versionId: string,
  filePath: string,
): Promise<DeploymentFile | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deployment_files')
    .select('*')
    .eq('deployment_id', deploymentId)
    .eq('version_id', versionId)
    .eq('file_path', filePath)
    .single()

  if (error || !data) return null
  return data
}
