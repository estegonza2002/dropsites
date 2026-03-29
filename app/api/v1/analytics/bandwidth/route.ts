import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/permissions'
import { getWorkspaceBandwidthUsage } from '@/lib/analytics/bandwidth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const role = await getUserRole(user.id, workspaceId)
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const days = Math.min(parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10), 365)
  const data = await getWorkspaceBandwidthUsage(workspaceId, days)

  return NextResponse.json({ data })
}
