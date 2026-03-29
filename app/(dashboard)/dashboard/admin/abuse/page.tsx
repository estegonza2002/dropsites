import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AbuseReportQueue } from '@/components/admin/abuse-report-queue'
import type { AbuseReport } from '@/lib/abuse/types'

export const metadata: Metadata = {
  title: 'Abuse reports — Admin — DropSites',
}

export default async function AdminAbusePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()

  // Check admin status
  const { data: userRow } = await admin
    .from('users')
    .select('limit_profile')
    .eq('id', user.id)
    .single()

  if (userRow?.limit_profile !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch pending reports
  const { data: reports } = await admin
    .from('abuse_reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-medium">Abuse reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and resolve abuse reports. Confirming a report disables the deployment, blocks content hashes, and may auto-suspend the account.
        </p>
      </div>

      <AbuseReportQueue initialReports={(reports ?? []) as AbuseReport[]} />
    </div>
  )
}
