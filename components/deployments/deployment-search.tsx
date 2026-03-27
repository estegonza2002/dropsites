'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type StatusFilter = 'all' | 'active' | 'disabled' | 'expired' | 'protected'

interface DeploymentSearchProps {
  query: string
  statusFilter: StatusFilter
  onQueryChange: (q: string) => void
  onStatusFilterChange: (f: StatusFilter) => void
}

export function DeploymentSearch({
  query,
  statusFilter,
  onQueryChange,
  onStatusFilterChange,
}: DeploymentSearchProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          size={16}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          placeholder="Search deployments…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
          <SelectItem value="protected">Protected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
