import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { generateAnalyticsPdf } from '@/lib/analytics/pdf-export'
import type { DateRange } from '@/lib/analytics/query'

type RouteContext = { params: Promise<{ slug: string }> }

const VALID_RANGES = new Set<string>(['7d', '30d', '90d'])

// POST /api/v1/deployments/[slug]/analytics/export
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { slug } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve deployment by slug
  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, slug, workspace_id')
    .eq('slug', slug)
    .single()

  if (!deployment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify workspace membership
  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Parse date range from body
  let dateRange: DateRange = '7d'
  try {
    const body = await request.json()
    if (body.dateRange && VALID_RANGES.has(body.dateRange)) {
      dateRange = body.dateRange as DateRange
    }
  } catch {
    // Default to 7d if body parsing fails
  }

  const pdf = await generateAnalyticsPdf({
    deploymentId: deployment.id,
    deploymentSlug: deployment.slug,
    dateRange,
  })

  const filename = `analytics-${deployment.slug}-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
    },
  })
}
