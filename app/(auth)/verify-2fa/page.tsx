'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Verify2FAPage() {
  const [mode, setMode] = useState<'totp' | 'backup'>('totp')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          type: mode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Invalid code')
        return
      }

      // Redirect to dashboard on success
      window.location.href = '/dashboard'
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          {mode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app'
            : 'Enter one of your backup codes'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'totp' ? (
            <div className="space-y-2">
              <Label htmlFor="totp-code">Authentication code</Label>
              <Input
                id="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                pattern="\d{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className="font-mono text-center text-lg tracking-widest"
                aria-label="Authentication code"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="backup-code">Backup code</Label>
              <Input
                id="backup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter backup code"
                autoFocus
                className="font-mono text-center"
                aria-label="Backup code"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          <div className="text-center">
            {mode === 'totp' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('backup')
                  setCode('')
                  setError('')
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Use a backup code instead
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('totp')
                  setCode('')
                  setError('')
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Use authenticator app
              </button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
