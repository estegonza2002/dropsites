'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, X, ExternalLink } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ABUSE_REASON_LABELS, type AbuseReason } from '@/lib/abuse/types'
import type { AbuseReport } from '@/lib/abuse/types'

interface AbuseReportQueueProps {
  initialReports: AbuseReport[]
}

export function AbuseReportQueue({ initialReports }: AbuseReportQueueProps) {
  const [reports, setReports] = useState<AbuseReport[]>(initialReports)
  const [filter, setFilter] = useState<'pending' | 'confirmed' | 'dismissed'>('pending')
  const [resolving, setResolving] = useState<string | null>(null)
  const [notesMap, setNotesMap] = useState<Record<string, string>>({})

  async function fetchReports(status: string) {
    const res = await fetch(`/api/v1/admin/abuse-reports?status=${status}`)
    if (res.ok) {
      const data = await res.json()
      setReports(data.reports ?? [])
    }
  }

  async function handleResolve(reportId: string, action: 'confirm' | 'dismiss') {
    setResolving(reportId)
    try {
      const res = await fetch('/api/v1/admin/abuse-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          action,
          resolution_notes: notesMap[reportId] ?? '',
        }),
      })

      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId))
      }
    } finally {
      setResolving(null)
    }
  }

  function handleFilterChange(newFilter: 'pending' | 'confirmed' | 'dismissed') {
    setFilter(newFilter)
    fetchReports(newFilter)
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['pending', 'confirmed', 'dismissed'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No {filter} reports.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Deployment</TableHead>
                <TableHead className="min-w-[100px]">Reason</TableHead>
                <TableHead className="min-w-[140px]">Reporter</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="min-w-[120px]">Date</TableHead>
                {filter === 'pending' && (
                  <TableHead className="min-w-[200px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {report.deployment_slug ?? report.deployment_url}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <a
                                href={report.deployment_url}
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
                    <Badge variant={report.reason === 'csam' ? 'destructive' : 'secondary'}>
                      {ABUSE_REASON_LABELS[report.reason as AbuseReason] ?? report.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{report.reporter_email}</TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.description}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(report.created_at)}
                  </TableCell>
                  {filter === 'pending' && (
                    <TableCell>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Resolution notes (optional)"
                          rows={1}
                          className="text-xs"
                          value={notesMap[report.id] ?? ''}
                          onChange={(e) =>
                            setNotesMap((prev) => ({ ...prev, [report.id]: e.target.value }))
                          }
                        />
                        <div className="flex gap-1.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    disabled={resolving === report.id}
                                    onClick={() => handleResolve(report.id, 'confirm')}
                                  >
                                    <Check className="h-3 w-3" strokeWidth={1.5} />
                                    Confirm
                                  </Button>
                                }
                              />
                              <TooltipContent>Disable deployment and block hashes</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    disabled={resolving === report.id}
                                    onClick={() => handleResolve(report.id, 'dismiss')}
                                  >
                                    <X className="h-3 w-3" strokeWidth={1.5} />
                                    Dismiss
                                </Button>
                                }
                              />
                              <TooltipContent>Dismiss this report</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
