import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryAuditLog, auditLogToCsv } from '@/lib/audit/writer'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const action = request.nextUrl.searchParams.get('action') ?? undefined
  const result = await queryAuditLog({ page: 1, limit: 10000, action })
  const csv = auditLogToCsv(result.entries)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="audit-log.csv"',
    },
  })
}
