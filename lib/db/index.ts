/**
 * Database backend factory.
 *
 * Selects between Supabase client and direct PostgreSQL based on
 * the DATABASE_BACKEND environment variable.
 *
 * - 'supabase' (default): Uses @supabase/supabase-js via existing helpers
 * - 'postgres': Uses direct pg connection pool via lib/db/pg-client
 */

export type DatabaseBackendType = 'supabase' | 'postgres'

/** Re-export pg helpers for direct use when DATABASE_BACKEND=postgres */
export { pgQuery, pgQuerySingle, pgExecute, pgClose } from './pg-client'
export type { PgQueryResult, PgError, PgRow } from './pg-client'

/**
 * Returns the active database backend type.
 */
export function getDatabaseBackend(): DatabaseBackendType {
  const backend = (process.env.DATABASE_BACKEND ?? 'supabase') as string

  if (backend === 'supabase' || backend === 'postgres') {
    return backend as DatabaseBackendType
  }

  throw new Error(
    `Unsupported DATABASE_BACKEND: "${backend}". Supported values: supabase, postgres`,
  )
}

/**
 * Returns true when the active backend is direct PostgreSQL.
 */
export function isPostgresBackend(): boolean {
  return getDatabaseBackend() === 'postgres'
}

/**
 * Returns true when the active backend is Supabase.
 */
export function isSupabaseBackend(): boolean {
  return getDatabaseBackend() === 'supabase'
}
