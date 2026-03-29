import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from './client'

export const metadata: Metadata = {
  title: 'Analytics — DropSites',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Get all deployments the user has access to
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  let deployments: Array<{ id: string; slug: string }> = []
  if (workspaceIds.length > 0) {
    const { data } = await admin
      .from('deployments')
      .select('id, slug')
      .in('workspace_id', workspaceIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    deployments = data ?? []
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-medium">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View traffic and referrer data for your deployments.
        </p>
      </div>

      {deployments.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No deployments yet. Deploy a site to start tracking analytics.
          </p>
        </div>
      ) : (
        <AnalyticsDashboard deployments={deployments} />
      )}
    </div>
  )
}
