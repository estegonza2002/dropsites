'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Check, Phone } from 'lucide-react'

type Props = {
  initialPhone: string | null
  initialVerified: boolean
}

type Step = 'idle' | 'sending' | 'otp' | 'verifying' | 'verified'

export function PhoneVerify({ initialPhone, initialVerified }: Props) {
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<Step>(initialVerified ? 'verified' : 'idle')
  const [error, setError] = useState<string | null>(null)

  const handleSendOtp = useCallback(async () => {
    setError(null)
    if (!phone.trim()) {
      setError('Enter a phone number')
      return
    }
    setStep('sending')
    try {
      const res = await fetch('/api/v1/account/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', phone: phone.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Failed to send OTP')
      }
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
      setStep('idle')
    }
  }, [phone])

  const handleVerify = useCallback(async () => {
    setError(null)
    if (!otp.trim()) {
      setError('Enter the verification code')
      return
    }
    setStep('verifying')
    try {
      const res = await fetch('/api/v1/account/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', phone: phone.trim(), otp: otp.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Invalid code')
      }
      setStep('verified')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setStep('otp')
    }
  }, [phone, otp])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Phone className="size-5 text-muted-foreground" strokeWidth={1.5} />
        <h3 className="text-sm font-medium">Phone number</h3>
        {step === 'verified' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
            <Check className="size-3" strokeWidth={1.5} />
            Verified
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Add a phone number to receive SMS notifications for security alerts and expiry warnings.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="phone-input">Phone number</Label>
          <Input
            id="phone-input"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (step === 'verified') setStep('idle')
            }}
            disabled={step === 'sending' || step === 'verifying'}
          />
        </div>
        {step !== 'otp' && step !== 'verifying' && (
          <Button
            variant="outline"
            onClick={handleSendOtp}
            disabled={step === 'sending' || step === 'verified'}
          >
            {step === 'sending' ? (
              <>
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                Sending...
              </>
            ) : step === 'verified' ? (
              'Verified'
            ) : (
              'Send code'
            )}
          </Button>
        )}
      </div>

      {(step === 'otp' || step === 'verifying') && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="otp-input">Verification code</Label>
            <Input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={step === 'verifying'}
              autoFocus
            />
          </div>
          <Button onClick={handleVerify} disabled={step === 'verifying'}>
            {step === 'verifying' ? (
              <>
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}
