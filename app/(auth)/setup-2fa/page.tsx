'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Setup2FAPage() {
  const [step, setStep] = useState<'generate' | 'verify' | 'backup'>('generate')
  const [secret, setSecret] = useState('')
  const [, setQrCodeUrl] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to generate 2FA secret')
        return
      }
      const data = await res.json()
      setSecret(data.secret)
      setQrCodeUrl(data.qrCodeUrl)
      setBackupCodes(data.backupCodes)
      setStep('verify')
    } catch {
      setError('Failed to generate 2FA secret')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Invalid code')
        return
      }
      setStep('backup')
    } catch {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Set up two-factor authentication</CardTitle>
        <CardDescription>
          {step === 'generate' && 'Add an extra layer of security to your account'}
          {step === 'verify' && 'Scan the QR code with your authenticator app'}
          {step === 'backup' && 'Save your backup codes in a safe place'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Generate */}
        {step === 'generate' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an extra layer of security by requiring a code
              from your authenticator app in addition to your password.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {loading ? 'Generating...' : 'Set up 2FA'}
            </Button>
          </div>
        )}

        {/* Step 2: Verify */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            {/* QR Code area */}
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-48 h-48 border rounded-lg flex items-center justify-center bg-white"
                aria-label="QR code for authenticator app"
              >
                {/* In production, render QR code from qrCodeUrl using a QR library */}
                <p className="text-xs text-muted-foreground text-center px-2">
                  QR code for authenticator app
                </p>
              </div>
            </div>

            {/* Manual entry */}
            <div className="space-y-2">
              <Label htmlFor="manual-secret">
                Or enter this code manually
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="manual-secret"
                  value={secret}
                  readOnly
                  className="font-mono text-sm"
                  aria-label="TOTP secret key"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(secret)}
                >
                  Copy
                </Button>
              </div>
            </div>

            {/* Verification code input */}
            <div className="space-y-2">
              <Label htmlFor="verify-code">
                Enter the 6-digit code from your app
              </Label>
              <Input
                id="verify-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                pattern="\d{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="font-mono text-center text-lg tracking-widest"
                aria-label="Verification code"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || verifyCode.length !== 6}
              className="w-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {loading ? 'Verifying...' : 'Verify and enable'}
            </Button>
          </form>
        )}

        {/* Step 3: Backup codes */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div
              className="bg-muted rounded-lg p-4"
              role="alert"
              aria-label="Backup codes"
            >
              <p className="text-sm font-medium mb-3">
                Save these backup codes. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code
                    key={i}
                    className="text-sm font-mono bg-background px-2 py-1 rounded border text-center"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const text = backupCodes.join('\n')
                navigator.clipboard.writeText(text)
              }}
            >
              Copy all codes
            </Button>

            <Button
              className="w-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onClick={() => {
                window.location.href = '/dashboard'
              }}
            >
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
