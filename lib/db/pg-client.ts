/**
 * Direct PostgreSQL client using the `pg` library.
 *
 * Provides a query interface that mirrors common Supabase patterns so callers
 * can swap backends without large refactors.
 *
 * Requires the `pg` package to be installed:
 *   pnpm add pg @types/pg
 *
 * Uses DATABASE_URL env var for connection string.
 */

// ---- Types (no runtime dependency on pg until actually used) ----

/** A single query result row — generic record. */
export type PgRow = Record<string, unknown>

/** Shape returned by query helpers, loosely compatible with Supabase's response. */
export interface PgQueryResult<T = PgRow> {
  data: T[] | null
  error: PgError | null
  count: number | null
}

export interface PgError {
  message: string
  code?: string
  details?: string
}

/** Minimal pool wrapper so we can lazy-init. */
interface PgPoolLike {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>
  end(): Promise<void>
}

// ---- Lazy pool ----

let _pool: PgPoolLike | null = null

async function getPool(): Promise<PgPoolLike> {
  if (_pool) return _pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required when DATABASE_BACKEND=postgres. ' +
        'Set it to a PostgreSQL connection string.',
    )
  }

  // Dynamic import so the pg dependency is only required when this backend is active.
  // @ts-expect-error — pg is an optional dependency, installed when DATABASE_BACKEND=postgres
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pg: any = await import('pg')
  const Pool = pg.default?.Pool ?? pg.Pool

  const pool: PgPoolLike = new Pool({
    connectionString,
    max: parseInt(process.env.PG_POOL_MAX ?? '10', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT ?? '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT ?? '5000', 10),
  })

  _pool = pool
  return _pool
}

// ---- Public API ----

/**
 * Execute a raw SQL query with parameterised values.
 *
 * ```ts
 * const result = await pgQuery<User>('SELECT * FROM users WHERE id = $1', [userId])
 * ```
 */
export async function pgQuery<T = PgRow>(
  text: string,
  values?: unknown[],
): Promise<PgQueryResult<T>> {
  try {
    const pool = await getPool()
    const result = await pool.query(text, values)
    return {
      data: result.rows as T[],
      error: null,
      count: result.rowCount,
    }
  } catch (err: unknown) {
    const pgErr = err as { message?: string; code?: string; detail?: string }
    return {
      data: null,
      error: {
        message: pgErr.message ?? 'Unknown database error',
        code: pgErr.code,
        details: pgErr.detail,
      },
      count: null,
    }
  }
}

/**
 * Execute a single-row query. Returns `data` as a single object or null.
 */
export async function pgQuerySingle<T = PgRow>(
  text: string,
  values?: unknown[],
): Promise<{ data: T | null; error: PgError | null }> {
  const result = await pgQuery<T>(text, values)
  if (result.error) return { data: null, error: result.error }
  return { data: result.data?.[0] ?? null, error: null }
}

/**
 * Execute an INSERT/UPDATE/DELETE that doesn't return rows.
 */
export async function pgExecute(
  text: string,
  values?: unknown[],
): Promise<{ error: PgError | null; count: number | null }> {
  const result = await pgQuery(text, values)
  return { error: result.error, count: result.count }
}

/**
 * Gracefully close the connection pool. Call during shutdown.
 */
export async function pgClose(): Promise<void> {
  if (_pool) {
    await _pool.end()
    _pool = null
  }
}

/** Reset pool reference — only for tests. */
export function _resetPoolForTesting(): void {
  _pool = null
}
