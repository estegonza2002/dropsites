'use client'

import React, { useEffect, useState } from 'react'

/**
 * API documentation page that renders the OpenAPI spec.
 * Uses a simple, self-contained approach to avoid heavy Swagger UI dependencies.
 */

interface PathOperation {
  summary?: string
  operationId?: string
  description?: string
  parameters?: Array<{
    name: string
    in: string
    required?: boolean
    schema?: Record<string, unknown>
    description?: string
  }>
  requestBody?: {
    required?: boolean
    content?: Record<string, { schema?: Record<string, unknown> }>
  }
  responses?: Record<string, { description?: string }>
}

type Spec = {
  info?: { title?: string; version?: string; description?: string }
  paths?: Record<string, Record<string, PathOperation>>
  components?: { schemas?: Record<string, Record<string, unknown>> }
}

const METHOD_STYLES: Record<string, React.CSSProperties> = {
  get:    { background: 'oklch(0.95 0.04 250)', color: 'oklch(0.38 0.15 250)' },
  post:   { background: 'var(--color-success-muted)', color: 'var(--color-success)' },
  put:    { background: 'var(--color-warning-muted)', color: 'var(--color-warning)' },
  patch:  { background: 'var(--color-expiring-muted)', color: 'var(--color-expiring)' },
  delete: { background: 'var(--color-danger-muted)', color: 'var(--color-danger)' },
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Spec | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/docs')
      .then((r) => r.json())
      .then(setSpec)
      .catch(() => setError('Failed to load API specification'))
  }, [])

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      </div>
    )
  }

  if (!spec) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-sm text-muted-foreground">Loading API docs...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-medium">{spec.info?.title ?? 'API'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {spec.info?.description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Version {spec.info?.version}
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="text-sm font-medium">Authentication</h2>
        <p className="text-sm text-muted-foreground">
          All endpoints require authentication via Bearer token (API key with{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">ds_</code>{' '}
          prefix) or session cookie.
        </p>
        <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
          Authorization: Bearer ds_your_api_key_here
        </pre>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-medium">Endpoints</h2>
        {spec.paths &&
          Object.entries(spec.paths).map(([path, methods]) =>
            Object.entries(methods).map(([method, op]) => {
              if (method === 'parameters') return null
              const operation = op as PathOperation
              return (
                <div key={`${method}-${path}`} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-medium uppercase"
                      style={METHOD_STYLES[method] ?? { background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      {method}
                    </span>
                    <code className="text-sm font-medium">{path}</code>
                  </div>
                  {operation.summary && (
                    <p className="text-sm text-muted-foreground">
                      {operation.summary}
                    </p>
                  )}
                  {operation.parameters && operation.parameters.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">
                        Parameters
                      </h4>
                      <div className="space-y-1">
                        {operation.parameters.map((p) => (
                          <div key={p.name} className="text-xs">
                            <code className="rounded bg-muted px-1 py-0.5">
                              {p.name}
                            </code>
                            <span className="text-muted-foreground ml-1">
                              ({p.in})
                              {p.required && (
                                <span className="text-[var(--color-danger)] ml-1">
                                  required
                                </span>
                              )}
                            </span>
                            {p.description && (
                              <span className="text-muted-foreground ml-1">
                                — {p.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {operation.responses && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">
                        Responses
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(operation.responses).map(
                          ([code, resp]) => (
                            <div key={code} className="text-xs">
                              <code className="rounded bg-muted px-1 py-0.5">
                                {code}
                              </code>
                              <span className="text-muted-foreground ml-1">
                                {resp.description}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            }),
          )}
      </div>

      <div className="text-xs text-muted-foreground border-t pt-4">
        <p>
          Rate limit headers are included on all responses:{' '}
          <code className="rounded bg-muted px-1 py-0.5">X-RateLimit-Limit</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5">X-RateLimit-Remaining</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5">X-RateLimit-Reset</code>.
          Exceeding limits returns 429 with a{' '}
          <code className="rounded bg-muted px-1 py-0.5">Retry-After</code> header.
        </p>
      </div>
    </div>
  )
}
