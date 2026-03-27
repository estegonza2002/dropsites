import Link from 'next/link'
import { TableCell, TableRow } from '@/components/ui/table'
import { StatusBadge } from './deployment-badges'
import { formatBytes, formatRelativeDate } from '@/lib/utils/format'
import type { DeploymentListItem } from './deployment-table'

interface DeploymentRowProps {
  deployment: DeploymentListItem
}

export function DeploymentRow({ deployment }: DeploymentRowProps) {
  return (
    <TableRow className="group">
      <TableCell className="font-medium">
        <Link
          href={`/dashboard/deployments/${deployment.slug}`}
          className="hover:text-[var(--color-accent)] transition-colors"
        >
          {deployment.slug}
        </Link>
        {deployment.namespace && (
          <span className="ml-1.5 text-xs text-muted-foreground">{deployment.namespace}</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge deployment={deployment} />
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground text-sm">
        {formatBytes(deployment.storage_bytes)}
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground text-sm">
        {deployment.total_views.toLocaleString()}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {formatRelativeDate(deployment.created_at)}
      </TableCell>
      {/* Actions column — populated in S17 */}
      <TableCell />
    </TableRow>
  )
}
