import { NextRequest, NextResponse } from 'next/server'
import { getThumbnailBuffer } from '@/lib/thumbnails/storage'

// GET /api/v1/thumbnails/[deploymentId] — serve deployment preview thumbnail
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ deploymentId: string }> },
): Promise<NextResponse> {
  const { deploymentId } = await ctx.params

  if (!deploymentId) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const buffer = await getThumbnailBuffer(deploymentId)

    if (!buffer) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('Thumbnail serve error:', err)
    return new NextResponse(null, { status: 500 })
  }
}
