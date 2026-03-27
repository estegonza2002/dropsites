'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeploymentRow } from './deployment-row'
import { DeploymentSearch, type StatusFilter } from './deployment-search'
import { EmptyState } from '@/components/common/empty-state'
import { Upload, Search } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

export type DeploymentListItem = Pick<
  Database['public']['Tables']['deployments']['Row'],
  | 'id'
  | 'slug'
  | 'namespace'
  | 'workspace_id'
  | 'entry_path'
  | 'file_count'
  | 'storage_bytes'
  | 'password_hash'
  | 'is_disabled'
  | 'is_admin_disabled'
  | 'health_status'
  | 'expires_at'
  | 'total_views'
  | 'created_at'
>

type SortField = 'slug' | 'storage_bytes' | 'total_views' | 'created_at'
type SortDir = 'asc' | 'desc'

interface DeploymentTableProps {
  deployments: DeploymentListItem[]
}


function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-muted-foreground/40">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

function matchesStatusFilter(d: DeploymentListItem, filter: StatusFilter): boolean {
  const now = new Date()
  const expiresAt = d.expires_at ? new Date(d.expires_at) : null
  switch (filter) {
    case 'all':
      return true
    case 'active':
      return !d.is_disabled && !d.is_admin_disabled && (!expiresAt || expiresAt > now)
    case 'disabled':
      return d.is_disabled || d.is_admin_disabled
    case 'expired':
      return !!expiresAt && expiresAt < now
    case 'protected':
      return !!d.password_hash
  }
}

export function DeploymentTable({ deployments }: DeploymentTableProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSortClick(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return deployments
      .filter((d) => {
        if (q && !d.slug.toLowerCase().includes(q)) return false
        return matchesStatusFilter(d, statusFilter)
      })
      .sort((a, b) => {
        let av: string | number = a[sortField] ?? ''
        let bv: string | number = b[sortField] ?? ''
        if (typeof av === 'string') av = av.toLowerCase()
        if (typeof bv === 'string') bv = bv.toLowerCase()
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [deployments, query, statusFilter, sortField, sortDir])

  if (deployments.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title="No deployments yet"
        description="Upload a file above to get your first shareable link."
      />
    )
  }

  return (
    <div className="space-y-4">
      <DeploymentSearch
        query={query}
        statusFilter={statusFilter}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description="No deployments match your search. Try a different query or filter."
        />
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSortClick('slug')}
                  >
                    Name / Slug
                    <SortIcon dir={sortField === 'slug' ? sortDir : null} />
                  </TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead
                    className="w-24 cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSortClick('storage_bytes')}
                  >
                    Size
                    <SortIcon dir={sortField === 'storage_bytes' ? sortDir : null} />
                  </TableHead>
                  <TableHead
                    className="w-20 cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSortClick('total_views')}
                  >
                    Views
                    <SortIcon dir={sortField === 'total_views' ? sortDir : null} />
                  </TableHead>
                  <TableHead
                    className="w-28 cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSortClick('created_at')}
                  >
                    Created
                    <SortIcon dir={sortField === 'created_at' ? sortDir : null} />
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <DeploymentRow key={d.id} deployment={d} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} of {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
