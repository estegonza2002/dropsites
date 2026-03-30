import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitFeedback, listFeedback } from '@/lib/beta/feedback'
import { createAdminClient } from '@/lib/supabase/admin'

async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('notification_prefs')
    .eq('id', userId)
    .single()
  const prefs = data?.notification_prefs as Record<string, unknown> | null
  return Boolean(prefs?.is_admin)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') ?? undefined
  const severity = searchParams.get('severity') ?? undefined

  try {
    const feedback = await listFeedback({ category, severity })
    return NextResponse.json({ feedback })
  } catch (err) {
    console.error('List beta feedback error:', err)
    return NextResponse.json({ error: 'Failed to list feedback' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.category || !body.body) {
    return NextResponse.json({ error: 'category and body are required' }, { status: 400 })
  }

  try {
    await submitFeedback(user.id, body as unknown as Parameters<typeof submitFeedback>[1])
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit feedback'
    console.error('Submit beta feedback error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
