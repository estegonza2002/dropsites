import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/deployments/deployment-badges'
import { HealthStatusBadge } from '@/components/deployments/health-status-badge'
import { CopyUrlButton } from '@/components/deployments/copy-url-button'
import { formatBytes, formatDate } from '@/lib/utils/format'
import { ArrowLeft, FileText, Globe } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return { title: `${slug} — DropSites` }
}

export default async function DeploymentDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  const admin = createAdminClient()

  // Verify user has access to this deployment's workspace
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  if (workspaceIds.length === 0) notFound()

  const { data: deployment } = await admin
    .from('deployments')
    .select(
      'id, slug, namespace, workspace_id, entry_path, file_count, storage_bytes, password_hash, is_disabled, is_admin_disabled, health_status, health_details, health_checked_at, expires_at, total_views, created_at, updated_at'
    )
    .eq('slug', slug)
    .in('workspace_id', workspaceIds)
    .is('archived_at', null)
    .single()

  if (!deployment) notFound()

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/${deployment.slug}`

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        All deployments
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">{deployment.slug}</h1>
          {deployment.namespace && (
            <p className="text-sm text-muted-foreground mt-0.5">{deployment.namespace}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge deployment={deployment} />
            <HealthStatusBadge status={deployment.health_status} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyUrlButton url={publicUrl} />
        </div>
      </div>

      <Separator />

      {/* Metadata grid */}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
        <MetaItem label="Public URL">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm hover:text-[var(--color-accent)] transition-colors truncate"
          >
            <Globe size={14} strokeWidth={1.5} className="shrink-0" />
            <span className="truncate">{publicUrl}</span>
          </a>
        </MetaItem>
        <MetaItem label="Entry file">
          <span className="flex items-center gap-1 text-sm">
            <FileText size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            {deployment.entry_path}
          </span>
        </MetaItem>
        <MetaItem label="Files">
          <span className="text-sm">{deployment.file_count.toLocaleString()}</span>
        </MetaItem>
        <MetaItem label="Size">
          <span className="text-sm">{formatBytes(deployment.storage_bytes)}</span>
        </MetaItem>
        <MetaItem label="Total views">
          <span className="text-sm">{deployment.total_views.toLocaleString()}</span>
        </MetaItem>
        <MetaItem label="Created">
          <span className="text-sm">{formatDate(deployment.created_at)}</span>
        </MetaItem>
        <MetaItem label="Last updated">
          <span className="text-sm">{formatDate(deployment.updated_at)}</span>
        </MetaItem>
        {deployment.expires_at && (
          <MetaItem label="Expires">
            <span className="text-sm">{formatDate(deployment.expires_at)}</span>
          </MetaItem>
        )}
        {deployment.health_checked_at && (
          <MetaItem label="Health check">
            <span className="text-sm">{formatDate(deployment.health_checked_at)}</span>
          </MetaItem>
        )}
      </dl>

      {/* Actions placeholder — populated in S17 */}
    </div>
  )
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
