import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Create account — DropSites',
}

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Create account</CardTitle>
        <CardDescription>Enter your email to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm requireTos />
      </CardContent>
    </Card>
  )
}
