'use client'

import { FileEdit, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiffSummaryProps {
  changedFiles: string[]
  className?: string
}

export function DiffSummary({ changedFiles, className }: DiffSummaryProps) {
  if (changedFiles.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border bg-[var(--color-warning-subtle)] p-3',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertCircle size={16} strokeWidth={1.5} className="text-[var(--color-warning)]" />
        <span>
          {changedFiles.length} file{changedFiles.length !== 1 ? 's' : ''} modified
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {changedFiles.map((path) => (
          <li key={path} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileEdit size={14} strokeWidth={1.5} className="shrink-0 text-[var(--color-warning)]" />
            <span className="truncate">{path}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
