import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SessionList } from '@/components/auth/session-list'
import type { SessionData } from '@/components/auth/session-list'

export const metadata: Metadata = {
  title: 'Active sessions — DropSites',
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: { session: currentSession } } = await supabase.auth.getSession()

  const admin = createAdminClient()
  const { data: rawSessions } = await admin.rpc('get_user_sessions', {
    user_uuid: user.id,
  })

  // The current session's row in auth.sessions matches on session id stored
  // in the JWT. We identify it by comparing updated_at recency as a fallback
  // since the admin RPC returns auth.sessions rows, not JWT session IDs.
  const sessions: SessionData[] = (rawSessions ?? []).map(
    (s: {
      id: string
      user_agent: string | null
      ip: string | null
      created_at: string
      updated_at: string
      not_after: string | null
    }, i: number) => ({
      id: s.id,
      userAgent: s.user_agent,
      ipHash: s.ip ? maskIp(s.ip) : null,
      createdAt: s.created_at,
      lastActiveAt: s.updated_at,
      expiresAt: s.not_after,
      // Mark the most recently active session as current when we have a live session
      isCurrent: currentSession !== null && i === 0,
    }),
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-medium">Active sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Devices currently signed in to your account.
        </p>
      </div>
      <SessionList sessions={sessions} />
    </div>
  )
}

function maskIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`
  const segments = ip.split(':')
  return segments.slice(0, 3).join(':') + ':…'
}
