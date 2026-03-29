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

  const autoNavInject = request.headers.get('x-auto-nav-inject')

  try {
    const { body, contentLength } = await storage.get(BUCKET, storageKey)

    // If we need to inject the auto-nav script, we must buffer the HTML
    // and inject before </body>. Only applies to HTML responses.
    if (autoNavInject && contentType.startsWith('text/html')) {
      const chunks: Buffer[] = []
      for await (const chunk of body) {
        chunks.push(Buffer.from(chunk))
      }
      let html = Buffer.concat(chunks).toString('utf-8')

      // Inject before </body> if present, otherwise append
      const bodyCloseIdx = html.lastIndexOf('</body>')
      if (bodyCloseIdx !== -1) {
        html =
          html.slice(0, bodyCloseIdx) +
          '\n' +
          autoNavInject +
          '\n' +
          html.slice(bodyCloseIdx)
      } else {
        html += '\n' + autoNavInject
      }

      const encoded = new TextEncoder().encode(html)
      return new NextResponse(encoded, {
        status: responseStatus,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(encoded.byteLength),
        },
      })
    }

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
