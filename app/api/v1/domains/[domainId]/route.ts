import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ domainId: string }> }

async function resolveDomain(domainId: string, userId: string) {
  const admin = createAdminClient()
  const { data: domain, error } = await admin
    .from('custom_domains')
    .select('*')
    .eq('id', domainId)
    .single()

  if (error || !domain) return null

  const role = await getUserRole(userId, domain.workspace_id)
  if (!role) return null

  return { domain, role }
}

// GET /api/v1/domains/[domainId] — domain status + verification instructions
export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { domainId } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveDomain(domainId, user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { domain } = resolved

  return NextResponse.json({
    ...domain,
    instructions: {
      cname: {
        host: domain.domain,
        value: domain.cname_target,
        description: `Add a CNAME record pointing ${domain.domain} to ${domain.cname_target}`,
      },
      txt: {
        host: `_dropsites.${domain.domain}`,
        value: domain.txt_record,
        description: `Add a TXT record at _dropsites.${domain.domain} with value ${domain.txt_record}`,
      },
    },
  })
}

// DELETE /api/v1/domains/[domainId] — remove custom domain
export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { domainId } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveDomain(domainId, user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!['owner', 'publisher'].includes(resolved.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('custom_domains')
    .delete()
    .eq('id', domainId)

  if (error) {
    console.error('Delete domain error:', error)
    return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
