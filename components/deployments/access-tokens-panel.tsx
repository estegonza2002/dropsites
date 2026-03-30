'use client'

import { useState, useCallback } from 'react'
import {
  Key,
  Copy,
  Check,
  // Trash2, // reserved for future bulk-delete
  Plus,
  AlertCircle,
  Eye,
  Clock,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type TokenStatus = 'active' | 'revoked' | 'expired' | 'exhausted'

type AccessToken = {
  id: string
  name: string
  token: string
  view_count: number
  max_views: number | null
  last_seen_at: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at: string
  status: TokenStatus
}

interface AccessTokensPanelProps {
  slug: string
  tokens: AccessToken[]
  onRefresh: () => void
}

const statusConfig: Record<TokenStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'text-[var(--color-success)] bg-[var(--color-success-subtle)]',
  },
  revoked: {
    label: 'Revoked',
    className: 'text-[var(--color-danger)] bg-[var(--color-danger-subtle)]',
  },
  expired: {
    label: 'Expired',
    className: 'text-[var(--color-warning)] bg-[var(--color-warning-subtle)]',
  },
  exhausted: {
    label: 'View limit reached',
    className: 'text-[var(--color-warning)] bg-[var(--color-warning-subtle)]',
  },
}

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

export function AccessTokensPanel({
  slug,
  tokens,
  onRefresh,
}: AccessTokensPanelProps) {
  const [isShowingForm, setIsShowingForm] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [maxViews, setMaxViews] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  async function handleCreateToken() {
    if (!tokenName.trim()) return
    setIsCreating(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { name: tokenName.trim() }
      if (maxViews) {
        const parsed = parseInt(maxViews, 10)
        if (isNaN(parsed) || parsed < 1) {
          setError('Max views must be a positive number')
          setIsCreating(false)
          return
        }
        body.maxViews = parsed
      }
      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString()
      }

      const res = await fetch(`/api/v1/deployments/${slug}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create token')
        return
      }

      setTokenName('')
      setMaxViews('')
      setExpiresAt('')
      setIsShowingForm(false)
      onRefresh()
    } catch {
      setError('Network error')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevoke(tokenId: string) {
    try {
      const res = await fetch(`/api/v1/deployments/${slug}/tokens/${tokenId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to revoke token')
        return
      }

      onRefresh()
    } catch {
      setError('Network error')
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={20} strokeWidth={1.5} />
          <h3 className="text-sm font-medium">Access Tokens</h3>
        </div>
        {!isShowingForm && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShowingForm(true)}
                className="gap-1.5"
              >
                <Plus size={16} strokeWidth={1.5} />
                Create Token
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create a new access token</TooltipContent>
          </Tooltip>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-[var(--color-danger-subtle)] px-3 py-2 text-sm text-[var(--color-danger)]">
          <AlertCircle size={16} strokeWidth={1.5} />
          {error}
        </div>
      )}

      {isShowingForm && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="space-y-2">
            <label htmlFor="token-name" className="text-xs font-medium">
              Name (required)
            </label>
            <Input
              id="token-name"
              placeholder="e.g. Client review link"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateToken()
                if (e.key === 'Escape') setIsShowingForm(false)
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="max-views" className="text-xs font-medium">
                Max views (optional)
              </label>
              <Input
                id="max-views"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="expires-at" className="text-xs font-medium">
                Expiry date (optional)
              </label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateToken}
              disabled={isCreating || !tokenName.trim()}
              className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
            >
              {isCreating ? 'Creating...' : 'Create Token'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsShowingForm(false)
                setTokenName('')
                setMaxViews('')
                setExpiresAt('')
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {tokens.length === 0 && !isShowingForm && (
        <p className="text-sm text-muted-foreground">
          No access tokens created. Create a token to generate unique trackable URLs for recipients.
        </p>
      )}

      {tokens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">URL</th>
                <th className="pb-2 pr-4 font-medium">Views</th>
                <th className="pb-2 pr-4 font-medium">Last seen</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => {
                const config = statusConfig[token.status]
                const tokenUrl = `${APP_URL}/${slug}?t=${token.token}`

                return (
                  <tr key={token.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{token.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                          ?t={token.token}
                        </span>
                        <Tooltip>
                          <TooltipTrigger>
                            <button
                              onClick={() => handleCopy(tokenUrl, token.id)}
                              className="shrink-0"
                            >
                              {copiedId === token.id ? (
                                <Check size={14} strokeWidth={1.5} className="text-[var(--color-success)]" />
                              ) : (
                                <Copy size={14} strokeWidth={1.5} />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Copy token URL</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Eye size={14} strokeWidth={1.5} className="text-muted-foreground" />
                        <span>
                          {token.view_count}
                          {token.max_views != null && ` / ${token.max_views}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock size={14} strokeWidth={1.5} />
                        {formatDate(token.last_seen_at)}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </td>
                    <td className="py-3">
                      {token.status === 'active' && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(token.id)}
                              className="h-8 w-8 p-0 text-[var(--color-danger)]"
                            >
                              <Ban size={16} strokeWidth={1.5} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Revoke token</TooltipContent>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
