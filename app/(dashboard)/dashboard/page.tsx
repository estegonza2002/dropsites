import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UploadZone } from '@/components/upload/upload-zone'
import { DeploymentTable } from '@/components/deployments/deployment-table'
import type { DeploymentListItem } from '@/components/deployments/deployment-table'
import { DashboardOnboarding } from './dashboard-onboarding'

export const metadata: Metadata = {
  title: 'Dashboard — DropSites',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let deployments: DeploymentListItem[] = []
  let roleByWorkspace: Record<string, 'owner' | 'publisher' | 'viewer'> = {}

  if (user) {
    const admin = createAdminClient()

    const { data: memberships } = await admin
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)

    const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

    roleByWorkspace = Object.fromEntries(
      (memberships ?? []).map((m) => [m.workspace_id, m.role as 'owner' | 'publisher' | 'viewer']),
    )

    if (workspaceIds.length > 0) {
      const { data } = await admin
        .from('deployments')
        .select(
          'id, slug, namespace, workspace_id, entry_path, file_count, storage_bytes, password_hash, is_disabled, is_admin_disabled, health_status, expires_at, total_views, created_at'
        )
        .in('workspace_id', workspaceIds)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      deployments = (data ?? []) as DeploymentListItem[]
    }
  }

  const hasDeployments = deployments.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Your Deployments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop a file to publish it instantly.
        </p>
      </div>

      <DashboardOnboarding hasDeployments={hasDeployments} />

      <UploadZone showSlugInput />

      <DeploymentTable deployments={deployments} roleByWorkspace={roleByWorkspace} />
    </div>
  )
}
