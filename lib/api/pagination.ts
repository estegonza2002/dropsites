import type { PaginatedMeta } from './response'

/**
 * Parse pagination query params with safe defaults and bounds.
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number
  perPage: number
  offset: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)),
  )
  return { page, perPage, offset: (page - 1) * perPage }
}

/**
 * Build the pagination meta object from a total count.
 */
export function buildPaginatedMeta(
  page: number,
  perPage: number,
  total: number,
): PaginatedMeta {
  return {
    page,
    per_page: perPage,
    total,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  }
}
