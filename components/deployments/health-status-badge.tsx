import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'

type HealthStatus = 'ok' | 'warning' | 'broken' | 'unknown'

const HEALTH_CONFIG: Record<HealthStatus, { label: string; icon: React.ReactNode; className: string }> = {
  ok: {
    label: 'OK',
    icon: <CheckCircle2 size={12} strokeWidth={1.5} />,
    className:
      'border-[var(--color-success-muted)] text-[var(--color-success)] bg-[var(--color-success-subtle)]',
  },
  warning: {
    label: 'Warning',
    icon: <AlertTriangle size={12} strokeWidth={1.5} />,
    className:
      'border-[var(--color-warning-muted)] text-[var(--color-warning)] bg-[var(--color-warning-subtle)]',
  },
  broken: {
    label: 'Broken',
    icon: <XCircle size={12} strokeWidth={1.5} />,
    className:
      'border-[var(--color-danger-muted)] text-[var(--color-danger)] bg-[var(--color-danger-subtle)]',
  },
  unknown: {
    label: 'Unknown',
    icon: <HelpCircle size={12} strokeWidth={1.5} />,
    className: 'border-border text-muted-foreground bg-muted',
  },
}

interface HealthStatusBadgeProps {
  status: string | null
}

export function HealthStatusBadge({ status }: HealthStatusBadgeProps) {
  const key = (status ?? 'unknown') as HealthStatus
  const config = HEALTH_CONFIG[key] ?? HEALTH_CONFIG.unknown
  return (
    <Badge variant="outline" className={`gap-1 text-xs font-normal ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  )
}
