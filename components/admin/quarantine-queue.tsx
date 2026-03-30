'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, X, ExternalLink, ShieldAlert } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface QuarantinedDeployment {
  id: string
  slug: string
  workspace_id: string
  owner_id: string
  health_status: string
  health_details: {
    reason?: string
    quarantined_at?: string
  } | null
  created_at: string
  storage_bytes: number
  file_count: number
}

interface QuarantineQueueProps {
  initialDeployments: QuarantinedDeployment[]
}

export function QuarantineQueue({ initialDeployments }: QuarantineQueueProps) {
  const [deployments, setDeployments] =
    useState<QuarantinedDeployment[]>(initialDeployments)
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleReview(deploymentId: string, action: 'approve' | 'reject') {
    setProcessing(deploymentId)
    try {
      const res = await fetch('/api/v1/admin/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deployment_id: deploymentId, action }),
      })

      if (res.ok) {
        setDeployments((prev) => prev.filter((d) => d.id !== deploymentId))
      }
    } finally {
      setProcessing(null)
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground mb-3" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          No quarantined deployments. The queue is clear.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Quarantined Deployments
        </h3>
        <Badge variant="destructive">{deployments.length}</Badge>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Deployment</TableHead>
              <TableHead className="min-w-[200px]">Reason</TableHead>
              <TableHead className="min-w-[80px]">Files</TableHead>
              <TableHead className="min-w-[80px]">Size</TableHead>
              <TableHead className="min-w-[140px]">Quarantined</TableHead>
              <TableHead className="min-w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {deployment.slug}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <a
                              href={`/d/${deployment.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                            </a>
                          }
                        />
                        <TooltipContent>Open deployment</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {deployment.health_details?.reason ?? 'Unknown'}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {deployment.file_count}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatBytes(deployment.storage_bytes)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {deployment.health_details?.quarantined_at
                    ? formatDate(deployment.health_details.quarantined_at)
                    : formatDate(deployment.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={processing === deployment.id}
                              onClick={() => handleReview(deployment.id, 'approve')}
                            >
                              <Check className="h-3 w-3" strokeWidth={1.5} />
                              Approve
                            </Button>
                          }
                        />
                        <TooltipContent>Restore deployment (false positive)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="xs"
                              variant="destructive"
                              disabled={processing === deployment.id}
                              onClick={() => handleReview(deployment.id, 'reject')}
                            >
                              <X className="h-3 w-3" strokeWidth={1.5} />
                              Reject
                            </Button>
                          }
                        />
                        <TooltipContent>Confirm threat and block hashes</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
