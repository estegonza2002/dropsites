import { RESERVED_SLUGS } from '@/lib/config/constants'

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase())
}
