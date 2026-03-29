'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AuditEntry {
  id: string
  action: string
  actor_email?: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const ACTION_FILTERS = [
  { value: '', label: 'All actions' },
  { value: 'deployment.', label: 'Deployments' },
  { value: 'workspace.', label: 'Workspaces' },
  { value: 'member.', label: 'Members' },
  { value: 'abuse.', label: 'Abuse' },
]

function actionBadgeVariant(action: string) {
  if (action.includes('delete') || action.includes('suspend') || action.includes('disable')) return 'destructive' as const
  if (action.includes('create') || action.includes('publish')) return 'default' as const
  return 'secondary' as const
}

export function AuditLogTable() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 25

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (actionFilter) params.set('action', actionFilter)
      const res = await fetch(`/api/v1/admin/audit-log?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    const params = new URLSearchParams()
    if (actionFilter) params.set('action', actionFilter)
    const res = await fetch(`/api/v1/admin/audit-log/export?${params}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audit-log.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <Filter className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                Export CSV
              </Button>
            }
          />
          <TooltipContent>Download audit log as CSV</TooltipContent>
        </Tooltip>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead className="hidden sm:table-cell">Actor</TableHead>
              <TableHead className="hidden md:table-cell">Target</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  No audit log entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant={actionBadgeVariant(entry.action)} className="text-xs">
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {entry.actor_email ?? '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {entry.target_type ? `${entry.target_type}:${entry.target_id?.slice(0, 8)}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Button variant="outline" size="icon-xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
