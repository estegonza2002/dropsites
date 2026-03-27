import type { Metadata } from 'next'
import { Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Check your email — DropSites',
}

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent you a magic link. Click it to sign in — no password needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder or{' '}
          <a href="/login" className="underline underline-offset-4 text-foreground hover:text-foreground/80">
            try again
          </a>
          .
        </p>
      </CardContent>
    </Card>
  )
}
