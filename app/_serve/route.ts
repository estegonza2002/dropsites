import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { Readable } from 'stream'

// This route is only reachable via NextResponse.rewrite() from middleware.
// Direct requests without the correct secret are rejected.
const INTERNAL_SERVE_SECRET =
  process.env.INTERNAL_SERVE_SECRET ?? 'dropsites-internal'

const BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites'

function nodeReadableToWebStream(readable: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      readable.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      readable.on('end', () => controller.close())
      readable.on('error', (err) => controller.error(err))
    },
    cancel() {
      readable.destroy()
    },
  })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get('x-serve-secret')
  if (secret !== INTERNAL_SERVE_SECRET) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const storageKey = request.headers.get('x-storage-key')
  const contentType =
    request.headers.get('x-content-type') ?? 'application/octet-stream'
  const responseStatus = parseInt(
    request.headers.get('x-response-status') ?? '200',
    10,
  )

  if (!storageKey) {
    return new NextResponse('Not Found', { status: 404 })
  }

  try {
    const { body, contentLength } = await storage.get(BUCKET, storageKey)
    const webStream = nodeReadableToWebStream(body)

    const headers: Record<string, string> = {
      'Content-Type': contentType,
    }
    if (contentLength > 0) {
      headers['Content-Length'] = String(contentLength)
    }

    return new NextResponse(webStream, { status: responseStatus, headers })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}
