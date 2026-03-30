import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { checkDomainVerification, DomainError } from '@/lib/domains/verify'
import { provisionCertificate } from '@/lib/domains/tls'

type RouteContext = { params: Promise<{ domainId: string }> }

// POST /api/v1/domains/[domainId]/verify — trigger verification check
export async function POST(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { domainId } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: domain, error } = await admin
    .from('custom_domains')
    .select('workspace_id, status')
    .eq('id', domainId)
    .single()

  if (error || !domain) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const role = await getUserRole(user.id, domain.workspace_id)
  if (!role || !['owner', 'publisher'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const status = await checkDomainVerification(domainId)

    // Auto-provision TLS on first verification
    let tlsStatus: string | null = null
    if (status === 'verified') {
      try {
        const tlsResult = await provisionCertificate(domainId)
        tlsStatus = tlsResult.status
      } catch {
        // TLS provisioning failure is non-fatal
        tlsStatus = 'error'
      }
    }

    return NextResponse.json({ status, tls: tlsStatus })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Verify domain error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
