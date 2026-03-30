import { NextResponse } from 'next/server'

/**
 * Standard API response envelope.
 *
 * All v1 API endpoints must use these helpers to ensure consistent
 * JSON structure matching the OpenAPI spec.
 */

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

export interface PaginatedMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface PaginatedBody<T> {
  data: T[]
  meta: PaginatedMeta
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function apiError(
  message: string,
  code: string,
  status: number,
  headers?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  const resp = NextResponse.json(
    { error: { code, message } },
    { status },
  )
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      resp.headers.set(k, v)
    }
  }
  return resp
}

export function apiPaginated<T>(
  data: T[],
  meta: PaginatedMeta,
): NextResponse<PaginatedBody<T>> {
  return NextResponse.json({ data, meta })
}
