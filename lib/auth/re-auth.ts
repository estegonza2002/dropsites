import { createClient } from '@/lib/supabase/server'

const RE_AUTH_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Returns true if the user authenticated within the re-auth window.
 * Call before sensitive actions (account deletion, password changes, etc.).
 *
 * Does NOT throw — callers decide how to handle false (redirect, modal, 403).
 */
export async function requireReAuth(_userId: string, _action: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.last_sign_in_at) return false

  const lastSignIn = new Date(user.last_sign_in_at).getTime()
  return Date.now() - lastSignIn < RE_AUTH_WINDOW_MS
}
