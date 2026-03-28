'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface InvitationInfo {
  email: string
  role: string
  workspace_name: string
  expires_at: string | null
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/v1/invitations/${params.token}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Invalid invitation')
          return
        }
        setInvitation(data.invitation)
      } catch {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }
    fetchInvitation()
  }, [params.token])

  async function handleAccept() {
    setError(null)
    setAccepting(true)

    try {
      const res = await fetch(`/api/v1/invitations/${params.token}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          // Redirect to login with return URL
          router.push(`/login?redirect=/invite/${params.token}`)
          return
        }
        setError(data.error ?? 'Failed to accept invitation')
        return
      }

      setAccepted(true)
      // Set workspace cookie and redirect to dashboard
      document.cookie = `ds-workspace=${data.workspace_id};path=/;max-age=${7 * 24 * 3600};samesite=lax`
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch {
      setError('Network error — please try again')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20">
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-[var(--color-success)]" strokeWidth={1.5} />
            <p className="text-sm font-medium">You have joined {invitation?.workspace_name}!</p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard\u2026</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20">
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <XCircle className="h-10 w-10 mx-auto text-[var(--color-danger)]" strokeWidth={1.5} />
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto mt-20">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Workspace invitation</CardTitle>
          <CardDescription>
            You have been invited to join <strong>{invitation?.workspace_name}</strong> as a{' '}
            <strong>{invitation?.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-muted-foreground text-center">
            Invitation for {invitation?.email}
          </div>

          {error && <p className="text-xs text-[var(--color-danger)] text-center">{error}</p>}

          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={handleAccept} disabled={accepting}>
              {accepting ? 'Accepting\u2026' : 'Accept invitation'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
