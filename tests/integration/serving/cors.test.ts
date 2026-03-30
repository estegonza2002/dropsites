// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildCorsHeaders,
  buildPreflightResponse,
  parseCorsConfig,
  DEFAULT_CORS_CONFIG,
  type CorsConfig,
} from '@/lib/serving/cors'

// ---------------------------------------------------------------------------
// parseCorsConfig
// ---------------------------------------------------------------------------

describe('parseCorsConfig', () => {
  it('returns null for null/undefined input', () => {
    expect(parseCorsConfig(null)).toBeNull()
    expect(parseCorsConfig(undefined)).toBeNull()
  })

  it('returns none config for empty object', () => {
    const result = parseCorsConfig({})
    expect(result).toEqual({ ...DEFAULT_CORS_CONFIG, mode: 'none' })
  })

  it('parses mode: none', () => {
    const result = parseCorsConfig({ mode: 'none' })
    expect(result?.mode).toBe('none')
  })

  it('parses mode: wildcard', () => {
    const result = parseCorsConfig({ mode: 'wildcard' })
    expect(result?.mode).toBe('wildcard')
  })

  it('parses mode: custom with origins', () => {
    const result = parseCorsConfig({
      mode: 'custom',
      origins: ['https://example.com', 'https://app.example.com'],
      methods: ['GET', 'POST'],
      headers: ['Content-Type', 'Authorization'],
    })
    expect(result).toEqual({
      mode: 'custom',
      origins: ['https://example.com', 'https://app.example.com'],
      methods: ['GET', 'POST'],
      headers: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  })

  it('filters out empty strings in origins', () => {
    const result = parseCorsConfig({
      mode: 'custom',
      origins: ['https://example.com', '', 'https://app.com'],
    })
    expect(result?.origins).toEqual(['https://example.com', 'https://app.com'])
  })

  it('uses default methods when not provided in custom mode', () => {
    const result = parseCorsConfig({
      mode: 'custom',
      origins: ['https://example.com'],
    })
    expect(result?.methods).toEqual(DEFAULT_CORS_CONFIG.methods)
  })

  it('respects custom maxAge', () => {
    const result = parseCorsConfig({
      mode: 'custom',
      origins: ['https://example.com'],
      maxAge: 3600,
    })
    expect(result?.maxAge).toBe(3600)
  })

  it('returns null for unknown mode', () => {
    expect(parseCorsConfig({ mode: 'invalid' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// buildCorsHeaders
// ---------------------------------------------------------------------------

describe('buildCorsHeaders', () => {
  it('returns empty object for mode: none', () => {
    const config: CorsConfig = { ...DEFAULT_CORS_CONFIG, mode: 'none' }
    expect(buildCorsHeaders(config, 'https://example.com')).toEqual({})
  })

  it('returns wildcard origin for mode: wildcard', () => {
    const config: CorsConfig = { ...DEFAULT_CORS_CONFIG, mode: 'wildcard' }
    const headers = buildCorsHeaders(config, 'https://example.com')
    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, HEAD, OPTIONS')
    expect(headers['Access-Control-Max-Age']).toBe('86400')
  })

  it('does not include Vary header for wildcard mode', () => {
    const config: CorsConfig = { ...DEFAULT_CORS_CONFIG, mode: 'wildcard' }
    const headers = buildCorsHeaders(config, 'https://example.com')
    expect(headers['Vary']).toBeUndefined()
  })

  it('returns matching origin for mode: custom with allowed origin', () => {
    const config: CorsConfig = {
      mode: 'custom',
      origins: ['https://example.com', 'https://app.example.com'],
      methods: ['GET', 'POST'],
      headers: ['Content-Type'],
      maxAge: 3600,
    }
    const headers = buildCorsHeaders(config, 'https://example.com')
    expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com')
    expect(headers['Vary']).toBe('Origin')
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST')
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type')
    expect(headers['Access-Control-Max-Age']).toBe('3600')
  })

  it('returns empty object for mode: custom with non-matching origin', () => {
    const config: CorsConfig = {
      mode: 'custom',
      origins: ['https://example.com'],
      methods: ['GET'],
      headers: [],
      maxAge: 86400,
    }
    const headers = buildCorsHeaders(config, 'https://evil.com')
    expect(headers).toEqual({})
  })

  it('returns empty object for mode: custom with empty origin string', () => {
    const config: CorsConfig = {
      mode: 'custom',
      origins: ['https://example.com'],
      methods: ['GET'],
      headers: [],
      maxAge: 86400,
    }
    const headers = buildCorsHeaders(config, '')
    expect(headers).toEqual({})
  })

  it('does not include Allow-Headers when headers array is empty', () => {
    const config: CorsConfig = {
      mode: 'custom',
      origins: ['https://example.com'],
      methods: ['GET'],
      headers: [],
      maxAge: 86400,
    }
    const headers = buildCorsHeaders(config, 'https://example.com')
    expect(headers['Access-Control-Allow-Headers']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// buildPreflightResponse
// ---------------------------------------------------------------------------

describe('buildPreflightResponse', () => {
  it('returns null for mode: none', () => {
    const config: CorsConfig = { ...DEFAULT_CORS_CONFIG, mode: 'none' }
    expect(buildPreflightResponse(config, 'https://example.com')).toBeNull()
  })

  it('includes Content-Length: 0 for wildcard preflight', () => {
    const config: CorsConfig = { ...DEFAULT_CORS_CONFIG, mode: 'wildcard' }
    const headers = buildPreflightResponse(config, 'https://example.com')
    expect(headers).not.toBeNull()
    expect(headers!['Content-Length']).toBe('0')
    expect(headers!['Access-Control-Allow-Origin']).toBe('*')
  })

  it('includes Content-Length: 0 for custom preflight with matching origin', () => {
    const config: CorsConfig = {
      mode: 'custom',
      origins: ['https://example.com'],
      methods: ['GET', 'POST', 'PUT'],
      headers: ['Content-Type', 'Authorization'],
      maxAge: 7200,
    }
    const headers = buildPreflightResponse(config, 'https://example.com')
    expect(headers).not.toBeNull()
    expect(headers!['Content-Length']).toBe('0')
    expect(headers!['Access-Control-Allow-Origin']).toBe('https://example.com')
    expect(headers!['Access-Control-Allow-Methods']).toBe('GET, POST, PUT')
    expect(headers!['Access-Control-Allow-Headers']).toBe(
      'Content-Type, Authorization',
    )
  })

  it('returns null for custom preflight with non-matching origin', () => {
    const config: CorsConfig = {
      mode: 'custom',
      origins: ['https://example.com'],
      methods: ['GET'],
      headers: [],
      maxAge: 86400,
    }
    expect(buildPreflightResponse(config, 'https://evil.com')).toBeNull()
  })
})
