import Link from 'next/link'
import { TableCell, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from './deployment-badges'
import { DeploymentRowActions } from './deployment-row-actions'
import { formatBytes, formatRelativeDate } from '@/lib/utils/format'
import type { DeploymentListItem } from './deployment-table'

type Role = 'owner' | 'publisher' | 'viewer'

interface DeploymentRowProps {
  deployment: DeploymentListItem
  role: Role
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<DeploymentListItem>) => void
  onDuplicate: (newDeployment: DeploymentListItem) => void
}

export function DeploymentRow({
  deployment,
  role,
  selected,
  onSelect,
  onDelete,
  onUpdate,
  onDuplicate,
}: DeploymentRowProps) {
  return (
    <TableRow className="group" data-state={selected ? 'selected' : undefined}>
      <TableCell className="w-10 pr-0">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(deployment.id, !!checked)}
          aria-label={`Select ${deployment.slug}`}
        />
      </TableCell>
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
      <TableCell className="w-10 pl-0">
        <DeploymentRowActions
          deployment={deployment}
          role={role}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onDuplicate={onDuplicate}
        />
      </TableCell>
    </TableRow>
  )
}
