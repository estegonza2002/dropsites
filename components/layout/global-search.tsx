'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Globe, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { GroupedSearchResults, SearchResult } from '@/lib/search/global-search'

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<GroupedSearchResults[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Cmd+K shortcut
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      // Small delay to allow dialog to render
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/search?q=${encodeURIComponent(query.trim())}`,
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data.grouped ?? [])
          setSelectedIndex(0)
        }
      } catch {
        // Silently fail — search is non-critical
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Get flat list of results for keyboard navigation
  const flatResults = React.useMemo(
    () => results.flatMap((g) => g.results),
    [results],
  )

  function navigateToResult(result: SearchResult) {
    setOpen(false)
    router.push(`/dashboard/deployments/${result.slug}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault()
      navigateToResult(flatResults[selectedIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const matchIcon = (field: SearchResult['matchField']) => {
    switch (field) {
      case 'domain':
        return <Globe size={16} strokeWidth={1.5} className="text-muted-foreground" />
      default:
        return <FileText size={16} strokeWidth={1.5} className="text-muted-foreground" />
    }
  }

  let flatIndex = 0

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search size={16} strokeWidth={1.5} />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border sm:inline-block">
          {'\u2318'}K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search deployments</DialogTitle>
          </DialogHeader>

          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search deployments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            {isLoading && (
              <Loader2
                size={16}
                strokeWidth={1.5}
                className="shrink-0 animate-spin text-muted-foreground"
              />
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query.trim().length >= 2 && !isLoading && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {results.map((group) => (
              <div key={group.workspace.id}>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group.workspace.name}
                </div>
                {group.results.map((result) => {
                  const currentIndex = flatIndex++
                  return (
                    <button
                      key={result.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                        currentIndex === selectedIndex && 'bg-muted',
                      )}
                      onClick={() => navigateToResult(result)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      {matchIcon(result.matchField)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{result.slug}</p>
                        {result.namespace && (
                          <p className="truncate text-xs text-muted-foreground">
                            {result.namespace}/{result.slug}
                          </p>
                        )}
                      </div>
                      {result.isDisabled && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          Disabled
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          {query.trim().length >= 2 && flatResults.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span>{flatResults.length} result{flatResults.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-background px-1 py-0.5 ring-1 ring-border">{'\u2191'}</kbd>
                <kbd className="rounded bg-background px-1 py-0.5 ring-1 ring-border">{'\u2193'}</kbd>
                <span>Navigate</span>
                <kbd className="rounded bg-background px-1 py-0.5 ring-1 ring-border">{'\u21B5'}</kbd>
                <span>Open</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
