import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isBetaUser } from '@/lib/beta/invites'

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ isBeta: false })
  }

  try {
    const beta = await isBetaUser(user.id)
    return NextResponse.json({ isBeta: beta })
  } catch {
    return NextResponse.json({ isBeta: false })
  }
}
