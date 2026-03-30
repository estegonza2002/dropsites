import { notFound } from 'next/navigation'
import { validateGuestToken } from '@/lib/workspaces/guest-access'
import { createAdminClient } from '@/lib/supabase/admin'

interface GuestWorkspacePageProps {
  params: Promise<{ token: string }>
}

export default async function GuestWorkspacePage({ params }: GuestWorkspacePageProps) {
  const { token } = await params

  const guest = await validateGuestToken(token)
  if (!guest) {
    notFound()
  }

  const admin = createAdminClient()

  // Fetch workspace deployments (read-only view)
  const { data: deployments } = await admin
    .from('deployments')
    .select('id, slug, namespace, entry_path, storage_bytes, file_count, created_at, updated_at, is_disabled')
    .eq('workspace_id', guest.workspaceId)
    .is('archived_at', null)
    .eq('is_disabled', false)
    .eq('is_admin_disabled', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="text-base font-medium">{guest.workspaceName}</h1>
            <p className="text-xs text-muted-foreground">Read-only guest view</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {!deployments || deployments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No deployments available.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
            </p>

            <div className="divide-y rounded-lg border">
              {deployments.map((deployment) => {
                const url = deployment.namespace
                  ? `${deployment.namespace}/${deployment.slug}`
                  : deployment.slug

                return (
                  <div key={deployment.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{url}</p>
                      <p className="text-xs text-muted-foreground">
                        {deployment.file_count} file{deployment.file_count !== 1 ? 's' : ''}
                        {' \u00b7 '}
                        {formatBytes(deployment.storage_bytes)}
                        {' \u00b7 '}
                        {new Date(deployment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}
