import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuditLogTable } from '@/components/admin/audit-log-table'

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all system actions and changes.
        </p>
      </div>
      <AuditLogTable />
    </div>
  )
}
