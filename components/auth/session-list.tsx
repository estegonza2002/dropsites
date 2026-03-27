'use client'

import { useState } from 'react'
import { Laptop, Smartphone, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface SessionData {
  id: string
  userAgent: string | null
  ipHash: string | null
  createdAt: string
  lastActiveAt: string
  expiresAt: string | null
  isCurrent: boolean
}

interface SessionListProps {
  sessions: SessionData[]
}

export function SessionList({ sessions: initial }: SessionListProps) {
  const [sessions, setSessions] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  async function terminate(id: string) {
    setLoading(id)
    const res = await fetch('/api/v1/auth/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id))
    }
    setLoading(null)
  }

  async function terminateAll() {
    setLoading('all')
    const res = await fetch('/api/v1/auth/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.isCurrent))
    }
    setLoading(null)
  }

  const others = sessions.filter((s) => !s.isCurrent)

  return (
    <div className="space-y-4">
      {others.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={terminateAll}
            disabled={loading !== null}
          >
            {loading === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : null}
            Terminate all other sessions
          </Button>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-center gap-4 px-4 py-3">
            <div className="text-muted-foreground shrink-0">
              <DeviceIcon ua={session.userAgent} />
            </div>

            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {parseDevice(session.userAgent)}
                </span>
                {session.isCurrent && (
                  <Badge variant="secondary" className="text-xs">Current</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {session.ipHash ?? 'Unknown IP'} · Last active{' '}
                {formatRelative(session.lastActiveAt)}
              </p>
            </div>

            {!session.isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => terminate(session.id)}
                disabled={loading !== null}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                {loading === session.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  'Terminate'
                )}
              </Button>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No active sessions found.
          </p>
        )}
      </div>
    </div>
  )
}

function DeviceIcon({ ua }: { ua: string | null }) {
  if (!ua) return <Globe className="h-5 w-5" strokeWidth={1.5} />
  const lower = ua.toLowerCase()
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
    return <Smartphone className="h-5 w-5" strokeWidth={1.5} />
  }
  return <Laptop className="h-5 w-5" strokeWidth={1.5} />
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'Unknown device'
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Android device'
  if (/Windows/i.test(ua)) {
    if (/Chrome/i.test(ua)) return 'Chrome on Windows'
    if (/Firefox/i.test(ua)) return 'Firefox on Windows'
    if (/Edge/i.test(ua)) return 'Edge on Windows'
    return 'Windows'
  }
  if (/Macintosh/i.test(ua)) {
    if (/Chrome/i.test(ua)) return 'Chrome on Mac'
    if (/Firefox/i.test(ua)) return 'Firefox on Mac'
    if (/Safari/i.test(ua)) return 'Safari on Mac'
    return 'Mac'
  }
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Unknown device'
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
