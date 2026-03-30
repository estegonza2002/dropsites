import { NextResponse } from 'next/server'
import { getOpenApiSpec } from '@/lib/api/openapi'

/**
 * GET /api/docs — returns the OpenAPI 3.1 JSON spec.
 */
export async function GET() {
  const spec = getOpenApiSpec()
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
