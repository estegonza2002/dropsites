import { NextRequest, NextResponse } from 'next/server'
import { validateSlug, checkSlugAvailability } from '@/lib/slug/validate'

// GET /api/v1/slug/check?slug=my-slug — check if a slug is valid and available
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')?.trim()

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  const validation = validateSlug(slug)
  if (!validation.valid) {
    return NextResponse.json({ available: false, valid: false, error: validation.errors[0] })
  }

  try {
    const available = await checkSlugAvailability(slug)
    return NextResponse.json({ available, valid: true })
  } catch {
    return NextResponse.json({ error: 'Failed to check slug availability' }, { status: 500 })
  }
}
