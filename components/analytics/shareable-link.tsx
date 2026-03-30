'use client'

import { useState } from 'react'
import { Copy, Check, Link, Loader2 } from 'lucide-react'

interface ShareableLinkProps {
  deploymentId: string
  baseUrl: string
}

/**
 * Generate a read-only analytics shareable link with optional expiry.
 */
export function ShareableLink({ deploymentId, baseUrl }: ShareableLinkProps) {
  const [expiryDays, setExpiryDays] = useState<string>('7')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/analytics/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_id: deploymentId,
          expires_in_days: expiryDays ? parseInt(expiryDays, 10) : null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to generate link')
      }

      const { token } = await res.json()
      setGeneratedUrl(`${baseUrl}/analytics/${token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text in a temporary input
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-medium mb-3">Shareable Analytics Link</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Generate a read-only link to share analytics with anyone.
      </p>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Expires in (days)
          </label>
          <select
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
            aria-label="Link expiry duration"
          >
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="">Never</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {loading ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Link size={16} strokeWidth={1.5} />
          )}
          Generate Link
        </button>
      </div>

      {error && (
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      {generatedUrl && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={generatedUrl}
            className="flex-1 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-sm font-mono truncate"
            onClick={(e) => (e.target as HTMLInputElement).select()}
            aria-label="Shareable analytics URL"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md border border-border p-1.5 hover:bg-muted/50 transition-colors"
            aria-label={copied ? 'Copied' : 'Copy link'}
          >
            {copied ? (
              <Check size={16} strokeWidth={1.5} style={{ color: 'var(--color-success)' }} />
            ) : (
              <Copy size={16} strokeWidth={1.5} className="text-muted-foreground" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
