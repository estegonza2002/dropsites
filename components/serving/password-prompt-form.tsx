'use client'

import { useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface PasswordPromptFormProps {
  slug: string
}

export function PasswordPromptForm({ slug }: PasswordPromptFormProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || loading) return

    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/v1/deployments/${slug}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        // Cookie is set by the API — redirect to the deployment
        window.location.href = `/${slug}`
        return
      }

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        retryAfter?: number
      }

      if (res.status === 429) {
        const minutes = Math.ceil((data.retryAfter ?? 900) / 60)
        setError(
          `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        )
      } else {
        setError(data.error ?? 'Incorrect password')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock size={16} strokeWidth={1.5} className="text-[var(--color-warning)]" />
          Password required
        </CardTitle>
        <CardDescription>
          This site is password-protected. Enter the password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="deployment-password" className="text-sm">
              Password
            </Label>
            <Input
              id="deployment-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Enter password"
              autoComplete="current-password"
              autoFocus
              disabled={loading}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'pw-error' : undefined}
            />
          </div>

          {error && (
            <p
              id="pw-error"
              role="alert"
              className="text-sm"
              style={{ color: 'var(--color-danger)' }}
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? (
              <>
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                Verifying...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
