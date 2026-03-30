'use client'

import { useState, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Webhook,
  Plus,
  Trash2,
  PlayCircle,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type WebhookEndpoint = {
  id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
}

type WebhookDelivery = {
  id: string
  event_type: string
  status_code: number | null
  response_time_ms: number
  success: boolean
  error: string | null
  created_at: string
}

const AVAILABLE_EVENTS = [
  { value: 'deployment.created', label: 'Deployment Created' },
  { value: 'deployment.updated', label: 'Deployment Updated' },
  { value: 'deployment.deleted', label: 'Deployment Deleted' },
  { value: 'deployment.disabled', label: 'Deployment Disabled' },
  { value: 'deployment.reactivated', label: 'Deployment Reactivated' },
] as const

interface WebhooksPanelProps {
  workspaceId: string
  initialEndpoints: WebhookEndpoint[]
}

export function WebhooksPanel({
  workspaceId,
  initialEndpoints,
}: WebhooksPanelProps) {
  const [endpoints, setEndpoints] =
    useState<WebhookEndpoint[]>(initialEndpoints)
  const [addOpen, setAddOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<
    Record<string, WebhookDelivery[]>
  >({})
  const [isPending, startTransition] = useTransition()

  const refreshEndpoints = useCallback(async () => {
    const res = await fetch(
      `/api/v1/webhooks?workspace_id=${workspaceId}`,
    )
    if (res.ok) {
      const data = await res.json()
      setEndpoints(data)
    }
  }, [workspaceId])

  const handleDelete = useCallback(
    async (endpointId: string) => {
      const res = await fetch(`/api/v1/webhooks/${endpointId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setEndpoints((prev) => prev.filter((e) => e.id !== endpointId))
      }
    },
    [],
  )

  const handleTest = useCallback(async (endpointId: string) => {
    await fetch(`/api/v1/webhooks/${endpointId}?action=test`, {
      method: 'POST',
    })
    // Refresh deliveries for this endpoint
    const res = await fetch(
      `/api/v1/webhooks/${endpointId}?include=deliveries`,
    )
    if (res.ok) {
      const data = await res.json()
      setDeliveries((prev) => ({ ...prev, [endpointId]: data }))
    }
  }, [])

  const toggleExpanded = useCallback(
    async (endpointId: string) => {
      if (expandedId === endpointId) {
        setExpandedId(null)
        return
      }
      setExpandedId(endpointId)
      // Fetch deliveries
      const res = await fetch(
        `/api/v1/webhooks/${endpointId}?include=deliveries`,
      )
      if (res.ok) {
        const data = await res.json()
        setDeliveries((prev) => ({ ...prev, [endpointId]: data }))
      }
    },
    [expandedId],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook size={20} strokeWidth={1.5} />
          <h3 className="text-base font-medium">Webhooks</h3>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                <Plus size={16} strokeWidth={1.5} data-icon="inline-start" />
                Add webhook
              </Button>
            }
          />
          <AddWebhookDialog
            workspaceId={workspaceId}
            onCreated={() => {
              setAddOpen(false)
              startTransition(() => {
                refreshEndpoints()
              })
            }}
          />
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Receive HTTP callbacks when deployment events occur in this workspace.
      </p>

      <Separator />

      {endpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No webhooks configured. Add one to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {endpoints.map((ep) => (
            <li
              key={ep.id}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{ep.url}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ep.events.length} event
                    {ep.events.length !== 1 ? 's' : ''} subscribed
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleTest(ep.id)}
                          disabled={isPending}
                        />
                      }
                    >
                      <PlayCircle size={16} strokeWidth={1.5} />
                    </TooltipTrigger>
                    <TooltipContent>Send test ping</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            toggleExpanded(ep.id)
                          }
                        />
                      }
                    >
                      {expandedId === ep.id ? (
                        <ChevronUp size={16} strokeWidth={1.5} />
                      ) : (
                        <ChevronDown size={16} strokeWidth={1.5} />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {expandedId === ep.id
                        ? 'Hide deliveries'
                        : 'Show deliveries'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => handleDelete(ep.id)}
                        />
                      }
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </TooltipTrigger>
                    <TooltipContent>Delete webhook</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Delivery log */}
              {expandedId === ep.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Recent deliveries
                  </p>
                  {!deliveries[ep.id]?.length ? (
                    <p className="text-xs text-muted-foreground">
                      No deliveries yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {deliveries[ep.id].slice(0, 10).map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          {d.success ? (
                            <CheckCircle2
                              size={14}
                              strokeWidth={1.5}
                              className="text-[var(--color-success)] shrink-0"
                            />
                          ) : (
                            <XCircle
                              size={14}
                              strokeWidth={1.5}
                              className="text-[var(--color-danger)] shrink-0"
                            />
                          )}
                          <span className="font-medium">
                            {d.event_type}
                          </span>
                          <span className="text-muted-foreground">
                            {d.status_code ?? 'ERR'}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <Clock
                              size={12}
                              strokeWidth={1.5}
                            />
                            {d.response_time_ms}ms
                          </span>
                          <span className="text-muted-foreground ml-auto">
                            {new Date(d.created_at).toLocaleTimeString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AddWebhookDialog({
  workspaceId,
  onCreated,
}: {
  workspaceId: string
  onCreated: () => void
}) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'deployment.created',
    'deployment.updated',
    'deployment.deleted',
  ])
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    )
  }

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          url,
          events: selectedEvents,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create webhook')
        return
      }

      const data = await res.json()
      setCreatedSecret(data.secret)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopySecret = async () => {
    if (!createdSecret) return
    await navigator.clipboard.writeText(createdSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (createdSecret) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhook created</DialogTitle>
          <DialogDescription>
            Copy your signing secret now. It will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-2 py-1.5 text-xs font-mono break-all">
            {createdSecret}
          </code>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleCopySecret}
                />
              }
            >
              {copied ? (
                <CheckCircle2 size={16} strokeWidth={1.5} />
              ) : (
                <Copy size={16} strokeWidth={1.5} />
              )}
            </TooltipTrigger>
            <TooltipContent>{copied ? 'Copied' : 'Copy secret'}</TooltipContent>
          </Tooltip>
        </div>
        <DialogFooter>
          <Button onClick={onCreated}>Done</Button>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add webhook</DialogTitle>
        <DialogDescription>
          Enter the URL that will receive webhook events.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="webhook-url" className="text-sm font-medium">
            Endpoint URL
          </Label>
          <Input
            id="webhook-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/dropsites"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Events</Label>
          <div className="space-y-1">
            {AVAILABLE_EVENTS.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(value)}
                  onChange={() => toggleEvent(value)}
                  className="rounded border-border"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        )}
      </div>

      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={!url || selectedEvents.length === 0 || submitting}
        >
          {submitting ? 'Creating...' : 'Create webhook'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
