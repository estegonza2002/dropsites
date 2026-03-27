'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { OAuthButtons } from './oauth-buttons'
import { TosCheckbox } from './tos-checkbox'
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  requireTos?: boolean
}

export function LoginForm({ requireTos = false }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [tosAccepted, setTosAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (requireTos && !tosAccepted) {
      setError('Please accept the Terms of Service to continue.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/confirm`,
        data: requireTos ? { tos_accepted: true } : undefined,
      },
    })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    router.push('/verify-email')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
        </div>

        {requireTos && (
          <TosCheckbox checked={tosAccepted} onCheckedChange={setTosAccepted} />
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          disabled={loading}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : null}
          Send magic link
        </Button>
      </form>

      <div className="relative flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">or continue with</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButtons />
    </div>
  )
}
