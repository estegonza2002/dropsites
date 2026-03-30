'use client'

import { useState, useCallback } from 'react'
import {
  Globe,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type DomainStatus = 'pending' | 'verified' | 'error'

type CustomDomain = {
  id: string
  domain: string
  cname_target: string
  txt_record: string
  status: DomainStatus
  tls_expires_at: string | null
  error_message: string | null
  verified_at: string | null
  created_at: string
}

interface CustomDomainPanelProps {
  deploymentId: string
  workspaceId: string
  domains: CustomDomain[]
  onRefresh: () => void
}

const statusConfig: Record<DomainStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pending: {
    label: 'Pending',
    className: 'text-[var(--color-warning)] bg-[var(--color-warning-subtle)]',
    icon: Clock,
  },
  verified: {
    label: 'Verified',
    className: 'text-[var(--color-success)] bg-[var(--color-success-subtle)]',
    icon: CheckCircle2,
  },
  error: {
    label: 'Error',
    className: 'text-[var(--color-danger)] bg-[var(--color-danger-subtle)]',
    icon: AlertCircle,
  },
}

export function CustomDomainPanel({
  deploymentId,
  workspaceId,
  domains,
  onRefresh,
}: CustomDomainPanelProps) {
  const [newDomain, setNewDomain] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isShowingForm, setIsShowingForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  async function handleAddDomain() {
    if (!newDomain.trim()) return
    setIsAdding(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain.trim(),
          deploymentId,
          workspaceId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add domain')
        return
      }

      setNewDomain('')
      setIsShowingForm(false)
      onRefresh()
    } catch {
      setError('Network error')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleVerify(domainId: string) {
    setVerifyingId(domainId)
    try {
      const res = await fetch(`/api/v1/domains/${domainId}/verify`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Verification failed')
      }

      onRefresh()
    } catch {
      setError('Network error')
    } finally {
      setVerifyingId(null)
    }
  }

  async function handleDelete(domainId: string) {
    try {
      const res = await fetch(`/api/v1/domains/${domainId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to delete domain')
        return
      }

      onRefresh()
    } catch {
      setError('Network error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={20} strokeWidth={1.5} />
          <h3 className="text-sm font-medium">Custom Domains</h3>
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
                Add Domain
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add a custom domain</TooltipContent>
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
        <div className="flex gap-2">
          <Input
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddDomain()
              if (e.key === 'Escape') setIsShowingForm(false)
            }}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleAddDomain}
            disabled={isAdding || !newDomain.trim()}
            className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
          >
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsShowingForm(false)
              setNewDomain('')
              setError(null)
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {domains.length === 0 && !isShowingForm && (
        <p className="text-sm text-muted-foreground">
          No custom domains configured. Add a domain to serve this deployment from your own URL.
        </p>
      )}

      <div className="space-y-3">
        {domains.map((domain) => {
          const config = statusConfig[domain.status]
          const StatusIcon = config.icon

          return (
            <div
              key={domain.id}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{domain.domain}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${config.className}`}
                  >
                    <StatusIcon size={12} strokeWidth={1.5} />
                    {config.label}
                  </span>
                  {domain.tls_expires_at && domain.status === 'verified' && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Shield size={14} strokeWidth={1.5} className="text-[var(--color-success)]" />
                      </TooltipTrigger>
                      <TooltipContent>TLS certificate active</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {domain.status !== 'verified' && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerify(domain.id)}
                          disabled={verifyingId === domain.id}
                          className="h-8 w-8 p-0"
                        >
                          <RefreshCw
                            size={16}
                            strokeWidth={1.5}
                            className={verifyingId === domain.id ? 'animate-spin' : ''}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Verify now</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(domain.id)}
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove domain</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {domain.status !== 'verified' && (
                <div className="space-y-2 rounded-md bg-muted/50 p-3 text-xs">
                  <p className="font-medium text-sm">DNS Setup Instructions</p>
                  <div className="space-y-1.5">
                    <p>1. Add a CNAME record:</p>
                    <div className="flex items-center gap-2 rounded bg-background px-2 py-1 font-mono">
                      <span className="flex-1 truncate">
                        {domain.domain} CNAME {domain.cname_target}
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <button
                            onClick={() =>
                              handleCopy(domain.cname_target, `cname-${domain.id}`)
                            }
                            className="shrink-0"
                          >
                            {copiedId === `cname-${domain.id}` ? (
                              <Check size={14} strokeWidth={1.5} className="text-[var(--color-success)]" />
                            ) : (
                              <Copy size={14} strokeWidth={1.5} />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Copy CNAME target</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p>2. Add a TXT record for verification:</p>
                    <div className="flex items-center gap-2 rounded bg-background px-2 py-1 font-mono">
                      <span className="flex-1 truncate">
                        _dropsites.{domain.domain} TXT {domain.txt_record}
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <button
                            onClick={() =>
                              handleCopy(domain.txt_record, `txt-${domain.id}`)
                            }
                            className="shrink-0"
                          >
                            {copiedId === `txt-${domain.id}` ? (
                              <Check size={14} strokeWidth={1.5} className="text-[var(--color-success)]" />
                            ) : (
                              <Copy size={14} strokeWidth={1.5} />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Copy TXT record value</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    DNS changes may take up to 48 hours to propagate.
                  </p>
                </div>
              )}

              {domain.error_message && (
                <p className="text-xs text-[var(--color-danger)]">{domain.error_message}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
