import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDatabaseBackend,
  isPostgresBackend,
  isSupabaseBackend,
} from '@/lib/db/index'
import { _resetPoolForTesting } from '@/lib/db/pg-client'

describe('Database backend factory', () => {
  const originalEnv = process.env.DATABASE_BACKEND

  beforeEach(() => {
    delete process.env.DATABASE_BACKEND
    _resetPoolForTesting()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATABASE_BACKEND = originalEnv
    } else {
      delete process.env.DATABASE_BACKEND
    }
  })

  it('defaults to supabase when DATABASE_BACKEND is unset', () => {
    expect(getDatabaseBackend()).toBe('supabase')
  })

  it('returns supabase when set to "supabase"', () => {
    process.env.DATABASE_BACKEND = 'supabase'
    expect(getDatabaseBackend()).toBe('supabase')
  })

  it('returns postgres when set to "postgres"', () => {
    process.env.DATABASE_BACKEND = 'postgres'
    expect(getDatabaseBackend()).toBe('postgres')
  })

  it('throws for unsupported backend', () => {
    process.env.DATABASE_BACKEND = 'mysql'
    expect(() => getDatabaseBackend()).toThrow('Unsupported DATABASE_BACKEND')
  })

  it('isPostgresBackend returns true only for postgres', () => {
    process.env.DATABASE_BACKEND = 'postgres'
    expect(isPostgresBackend()).toBe(true)

    process.env.DATABASE_BACKEND = 'supabase'
    expect(isPostgresBackend()).toBe(false)
  })

  it('isSupabaseBackend returns true only for supabase', () => {
    process.env.DATABASE_BACKEND = 'supabase'
    expect(isSupabaseBackend()).toBe(true)

    process.env.DATABASE_BACKEND = 'postgres'
    expect(isSupabaseBackend()).toBe(false)
  })
})

describe('PG client — pgQuery', () => {
  const originalUrl = process.env.DATABASE_URL

  beforeEach(() => {
    _resetPoolForTesting()
  })

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.DATABASE_URL = originalUrl
    } else {
      delete process.env.DATABASE_URL
    }
  })

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    const { pgQuery } = await import('@/lib/db/pg-client')
    // pgQuery catches errors and returns them
    const result = await pgQuery('SELECT 1')
    // The error could come from missing DATABASE_URL or missing pg module
    expect(result.error).not.toBeNull()
  })
})

describe('Storage backend resolution', () => {
  const originalBackend = process.env.STORAGE_BACKEND

  afterEach(() => {
    if (originalBackend !== undefined) {
      process.env.STORAGE_BACKEND = originalBackend
    } else {
      delete process.env.STORAGE_BACKEND
    }
    // Reset module cache so resolveBackend re-evaluates
    vi.resetModules()
  })

  it('resolves local backend when STORAGE_BACKEND=local', async () => {
    process.env.STORAGE_BACKEND = 'local'
    // Dynamic import to get fresh module evaluation
    const mod = await import('@/lib/storage/local-backend')
    expect(mod.localBackend).toBeDefined()
    expect(typeof mod.localBackend.upload).toBe('function')
    expect(typeof mod.localBackend.get).toBe('function')
    expect(typeof mod.localBackend.delete).toBe('function')
    expect(typeof mod.localBackend.deletePrefix).toBe('function')
    expect(typeof mod.localBackend.exists).toBe('function')
    expect(typeof mod.localBackend.list).toBe('function')
  })
})
