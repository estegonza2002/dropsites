import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationPreferencesForm } from '@/components/notifications/notification-preferences-form'
import { PhoneVerify } from '@/components/notifications/phone-verify'
import { Separator } from '@/components/ui/separator'
import { getDefaultPrefs, type NotificationPrefs } from '@/lib/notifications/types'

export const metadata: Metadata = {
  title: 'Notification preferences — DropSites',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()
  const { data: userRow } = await admin
    .from('users')
    .select('notification_prefs, phone_number, phone_verified_at')
    .eq('id', user.id)
    .single()

  const savedPrefs = (userRow?.notification_prefs ?? {}) as NotificationPrefs
  const defaults = getDefaultPrefs()
  // Merge saved over defaults
  const prefs: NotificationPrefs = { ...defaults }
  for (const key of Object.keys(savedPrefs)) {
    if (prefs[key] && typeof savedPrefs[key] === 'object') {
      prefs[key] = { ...prefs[key], ...savedPrefs[key] }
    }
  }

  const phoneVerified = !!userRow?.phone_verified_at

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Notification preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you want to be notified about activity on your deployments.
        </p>
      </div>

      <NotificationPreferencesForm initialPrefs={prefs} phoneVerified={phoneVerified} />

      <Separator />

      <PhoneVerify
        initialPhone={userRow?.phone_number ?? null}
        initialVerified={phoneVerified}
      />
    </div>
  )
}
