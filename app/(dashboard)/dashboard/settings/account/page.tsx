import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AccountSettingsClient } from './account-settings-client'

export const metadata: Metadata = {
  title: 'Account Settings — DropSites',
}

export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()
  const { data: userData } = await admin
    .from('users')
    .select('id, email, display_name, created_at')
    .eq('id', user.id)
    .single()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences.
        </p>
      </div>

      {/* Account info */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Account information</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{userData?.email ?? user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Display name</span>
            <span>{userData?.display_name ?? 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span>
              {userData?.created_at
                ? new Date(userData.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Delete account */}
      <AccountSettingsClient userEmail={userData?.email ?? user.email ?? ''} />
    </div>
  )
}
