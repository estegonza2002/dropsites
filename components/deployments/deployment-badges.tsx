import { Badge } from '@/components/ui/badge'
import { Lock, PauseCircle, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type DeploymentRow = Database['public']['Tables']['deployments']['Row']

type StatusInfo = {
  label: string
  icon: React.ReactNode
  className: string
}

function getStatusInfo(
  deployment: Pick<
    DeploymentRow,
    'is_disabled' | 'is_admin_disabled' | 'password_hash' | 'expires_at' | 'health_status'
  >
): StatusInfo {
  const now = new Date()
  const expiresAt = deployment.expires_at ? new Date(deployment.expires_at) : null
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  if (deployment.is_admin_disabled) {
    return {
      label: 'Suspended',
      icon: <AlertTriangle size={12} strokeWidth={1.5} />,
      className:
        'border-[var(--color-danger-muted)] text-[var(--color-danger)] bg-[var(--color-danger-subtle)]',
    }
  }

  if (deployment.is_disabled) {
    return {
      label: 'Disabled',
      icon: <PauseCircle size={12} strokeWidth={1.5} />,
      className:
        'border-[var(--color-warning-muted)] text-[var(--color-warning)] bg-[var(--color-warning-subtle)]',
    }
  }

  if (expiresAt && expiresAt < now) {
    return {
      label: 'Expired',
      icon: <Clock size={12} strokeWidth={1.5} />,
      className:
        'border-[var(--color-expiring-muted)] text-[var(--color-expiring)] bg-[var(--color-expiring-subtle)] opacity-70',
    }
  }

  if (expiresAt && expiresAt.getTime() - now.getTime() < sevenDays) {
    return {
      label: 'Expiring',
      icon: <Clock size={12} strokeWidth={1.5} />,
      className:
        'border-[var(--color-expiring-muted)] text-[var(--color-expiring)] bg-[var(--color-expiring-subtle)]',
    }
  }

  if (deployment.health_status === 'broken') {
    return {
      label: 'Broken',
      icon: <AlertTriangle size={12} strokeWidth={1.5} />,
      className:
        'border-[var(--color-danger-muted)] text-[var(--color-danger)] bg-[var(--color-danger-subtle)]',
    }
  }

  if (deployment.password_hash) {
    return {
      label: 'Protected',
      icon: <Lock size={12} strokeWidth={1.5} />,
      className: 'border-border text-muted-foreground bg-muted',
    }
  }

  return {
    label: 'Active',
    icon: <CheckCircle size={12} strokeWidth={1.5} />,
    className:
      'border-[var(--color-success-muted)] text-[var(--color-success)] bg-[var(--color-success-subtle)]',
  }
}

interface StatusBadgeProps {
  deployment: Pick<
    DeploymentRow,
    'is_disabled' | 'is_admin_disabled' | 'password_hash' | 'expires_at' | 'health_status'
  >
}

export function StatusBadge({ deployment }: StatusBadgeProps) {
  const { label, icon, className } = getStatusInfo(deployment)
  return (
    <Badge variant="outline" className={`gap-1 text-xs font-normal ${className}`}>
      {icon}
      {label}
    </Badge>
  )
}
