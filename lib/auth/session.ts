import { createClient } from '@/lib/supabase/server'

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'unauthenticated' | 'email_unverified',
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Returns the current authenticated Supabase user, or null if not signed in.
 * Server-side only.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

/**
 * Returns the current user or throws AuthError if not signed in.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError('Not authenticated', 'unauthenticated')
  }
  return user
}

/**
 * Returns the current user or throws AuthError if not signed in or email unverified.
 */
export async function requireEmailVerified() {
  const user = await requireAuth()
  if (!user.email_confirmed_at) {
    throw new AuthError('Email not verified', 'email_unverified')
  }
  return user
}
