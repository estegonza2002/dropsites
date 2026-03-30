'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Upload, Trash2, UserPlus, Shield, ArrowRightLeft, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AuditEvent {
  id: string
  action: string
  actor_id: string | null
  target_id: string | null
  target_type: string | null
  details: Record<string, unknown> | null
  created_at: string
}

interface ActivityFeedProps {
  workspaceId: string
}

const ACTION_CONFIG: Record<string, { icon: typeof Upload; label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'deployment.publish': { icon: Upload, label: 'Published', variant: 'default' },
  'deployment.create': { icon: Upload, label: 'Created', variant: 'default' },
  'deployment.update': { icon: Settings, label: 'Updated', variant: 'secondary' },
  'deployment.delete': { icon: Trash2, label: 'Deleted', variant: 'destructive' },
  'deployment.disable': { icon: Settings, label: 'Disabled', variant: 'secondary' },
  'deployment.enable': { icon: Settings, label: 'Enabled', variant: 'secondary' },
  'workspace.member_invite': { icon: UserPlus, label: 'Invited', variant: 'default' },
  'workspace.member_remove': { icon: Trash2, label: 'Removed member', variant: 'destructive' },
  'workspace.member_role_change': { icon: Shield, label: 'Role changed', variant: 'secondary' },
  'workspace.transfer_initiated': { icon: ArrowRightLeft, label: 'Transfer started', variant: 'secondary' },
  'workspace.transfer_completed': { icon: ArrowRightLeft, label: 'Transferred', variant: 'default' },
  'workspace.update': { icon: Settings, label: 'Settings updated', variant: 'secondary' },
  'workspace.delete': { icon: Trash2, label: 'Deleted', variant: 'destructive' },
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { icon: Settings, label: action, variant: 'outline' as const }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function ActivityFeed({ workspaceId }: ActivityFeedProps) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/activity?limit=100`,
      )
      if (!res.ok) {
        setError('Failed to load activity')
        return
      }
      const data = await res.json()
      setEvents(data.data ?? [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchEvents}>
          Retry
        </Button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No activity yet.
      </p>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Recent activity</h3>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-xs" onClick={fetchEvents}>
                  <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              }
            />
            <TooltipContent>Refresh activity</TooltipContent>
          </Tooltip>
        </div>

        <div className="divide-y">
          {events.map((event) => {
            const config = getActionConfig(event.action)
            const Icon = config.icon

            return (
              <div key={event.id} className="flex items-start gap-3 py-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(event.created_at)}
                    </span>
                  </div>
                  {event.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {summarizeDetails(event.action, event.details)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

function summarizeDetails(action: string, details: Record<string, unknown>): string {
  if (action.includes('invite') && details.email) {
    return `${details.email} as ${details.role ?? 'member'}`
  }
  if (action.includes('role_change') && details.new_role) {
    return `Changed to ${details.new_role}`
  }
  if (action.includes('transfer') && details.new_owner_id) {
    return `To user ${String(details.new_owner_id).slice(0, 8)}...`
  }
  if (details.name) {
    return String(details.name)
  }
  if (details.slug) {
    return String(details.slug)
  }
  return ''
}
