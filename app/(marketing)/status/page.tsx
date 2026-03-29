'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity,
  Database,
  HardDrive,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'

type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'loading'

interface HealthData {
  status: ServiceStatus
  timestamp: string
  version: string
  services: {
    database: ServiceStatus
    storage: ServiceStatus
  }
}

/** Auto-refreshing status page — polls /api/health every 60 seconds. */
export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/health', { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setHealth(data)
        setError(null)
      } else {
        const data: HealthData = await res.json()
        setHealth(data)
        setError(null)
      }
      setLastChecked(new Date())
    } catch {
      setError('Unable to reach the health endpoint.')
      setHealth(null)
      setLastChecked(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 60_000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const overallStatus = health?.status ?? (error ? 'down' : 'loading')

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg, #fafafa)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--color-border, #e5e7eb)' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <a
            href="/"
            className="text-lg font-medium"
            style={{ color: 'var(--color-text-primary, #18181b)' }}
          >
            Drop<span style={{ color: 'var(--color-accent)' }}>Sites</span>
          </a>
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-secondary, #71717a)' }}
          >
            System Status
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Overall status banner */}
        <div
          className="mb-8 rounded-lg p-6"
          style={{
            background:
              overallStatus === 'healthy'
                ? 'var(--color-success-subtle)'
                : overallStatus === 'loading'
                  ? 'var(--color-warning-subtle)'
                  : 'var(--color-danger-subtle)',
            border: '1px solid',
            borderColor:
              overallStatus === 'healthy'
                ? 'var(--color-success-muted)'
                : overallStatus === 'loading'
                  ? 'var(--color-warning-muted)'
                  : 'var(--color-danger-muted)',
          }}
        >
          <div className="flex items-center gap-3">
            <Activity
              size={20}
              strokeWidth={1.5}
              style={{
                color:
                  overallStatus === 'healthy'
                    ? 'var(--color-success)'
                    : overallStatus === 'loading'
                      ? 'var(--color-warning)'
                      : 'var(--color-danger)',
              }}
            />
            <div>
              <h1
                className="text-base font-medium"
                style={{ color: 'var(--color-text-primary, #18181b)' }}
              >
                {overallStatus === 'healthy' && 'All systems operational'}
                {overallStatus === 'degraded' && 'Partial system degradation'}
                {overallStatus === 'down' && 'System outage detected'}
                {overallStatus === 'loading' && 'Checking system status...'}
              </h1>
              {lastChecked && (
                <p
                  className="mt-0.5 text-sm"
                  style={{ color: 'var(--color-text-secondary, #71717a)' }}
                >
                  Last checked {lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="ml-auto rounded-md p-1.5 transition-colors hover:opacity-70 disabled:opacity-40"
              style={{ color: 'var(--color-text-secondary, #71717a)' }}
              aria-label="Refresh status"
              title="Refresh status"
            >
              <RefreshCw
                size={16}
                strokeWidth={1.5}
                className={loading ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-6 rounded-lg p-4 text-sm"
            style={{
              background: 'var(--color-danger-subtle)',
              border: '1px solid var(--color-danger-muted)',
              color: 'var(--color-danger)',
            }}
          >
            {error}
          </div>
        )}

        {/* Service list */}
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: 'var(--color-text-secondary, #71717a)' }}
        >
          Services
        </h2>

        <div
          className="divide-y rounded-lg border"
          style={{
            borderColor: 'var(--color-border, #e5e7eb)',
            background: 'var(--color-bg-card, #ffffff)',
          }}
        >
          <ServiceRow
            icon={<Database size={16} strokeWidth={1.5} />}
            name="Database"
            description="PostgreSQL via Supabase"
            status={health?.services.database ?? (loading ? 'loading' : 'down')}
          />
          <ServiceRow
            icon={<HardDrive size={16} strokeWidth={1.5} />}
            name="Storage"
            description="Cloudflare R2 object storage"
            status={health?.services.storage ?? (loading ? 'loading' : 'down')}
          />
          <ServiceRow
            icon={<Mail size={16} strokeWidth={1.5} />}
            name="Email"
            description="Transactional email via Resend"
            status={health ? 'healthy' : loading ? 'loading' : 'down'}
          />
        </div>

        {/* Version info */}
        {health?.version && (
          <p
            className="mt-6 text-center text-xs"
            style={{ color: 'var(--color-text-secondary, #71717a)' }}
          >
            Version {health.version}
          </p>
        )}

        {/* Auto-refresh note */}
        <p
          className="mt-2 text-center text-xs"
          style={{ color: 'var(--color-text-tertiary, #a1a1aa)' }}
        >
          This page auto-refreshes every 60 seconds.
        </p>
      </main>
    </div>
  )
}

function ServiceRow({
  icon,
  name,
  description,
  status,
}: {
  icon: React.ReactNode
  name: string
  description: string
  status: ServiceStatus
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span style={{ color: 'var(--color-text-secondary, #71717a)' }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary, #18181b)' }}
        >
          {name}
        </p>
        <p
          className="text-xs"
          style={{ color: 'var(--color-text-secondary, #71717a)' }}
        >
          {description}
        </p>
      </div>
      <StatusBadge status={status} />
    </div>
  )
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === 'loading') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          background: 'var(--color-warning-subtle)',
          color: 'var(--color-warning)',
        }}
      >
        <RefreshCw size={12} strokeWidth={1.5} className="animate-spin" />
        Checking
      </span>
    )
  }

  if (status === 'healthy') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          background: 'var(--color-success-subtle)',
          color: 'var(--color-success)',
        }}
      >
        <CheckCircle2 size={12} strokeWidth={1.5} />
        Operational
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: 'var(--color-danger-subtle)',
        color: 'var(--color-danger)',
      }}
    >
      <XCircle size={12} strokeWidth={1.5} />
      {status === 'degraded' ? 'Degraded' : 'Down'}
    </span>
  )
}
