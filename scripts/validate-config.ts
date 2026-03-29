#!/usr/bin/env tsx
/**
 * validate-config.ts — Self-hosted configuration validator
 *
 * Checks env vars, DB connectivity, storage connectivity, and email
 * service reachability. Intended to be run before starting the app
 * in a self-hosted environment.
 *
 * Usage:
 *   npx tsx scripts/validate-config.ts
 *   pnpm validate:config
 */

import { createClient } from '@supabase/supabase-js'

/* ── Colour helpers for terminal output ───────────────────────── */
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`

type CheckResult = { name: string; status: 'pass' | 'warn' | 'fail'; message: string }

const results: CheckResult[] = []

function pass(name: string, message: string) {
  results.push({ name, status: 'pass', message })
}

function warn(name: string, message: string) {
  results.push({ name, status: 'warn', message })
}

function fail(name: string, message: string) {
  results.push({ name, status: 'fail', message })
}

/* ── 1. Required env vars ─────────────────────────────────────── */
function checkEnvVars() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]

  const optional = [
    { key: 'R2_ACCOUNT_ID', group: 'storage' },
    { key: 'R2_ACCESS_KEY_ID', group: 'storage' },
    { key: 'R2_SECRET_ACCESS_KEY', group: 'storage' },
    { key: 'R2_BUCKET_NAME', group: 'storage' },
    { key: 'RESEND_API_KEY', group: 'email' },
    { key: 'SENTRY_DSN', group: 'monitoring' },
  ]

  for (const key of required) {
    if (process.env[key]) {
      pass(`env:${key}`, 'Set')
    } else {
      fail(`env:${key}`, 'Missing — required for the application to start')
    }
  }

  const storageBackend = process.env.STORAGE_BACKEND ?? 'r2'
  if (storageBackend === 'r2') {
    const storageVars = optional.filter((v) => v.group === 'storage')
    for (const { key } of storageVars) {
      if (process.env[key]) {
        pass(`env:${key}`, 'Set')
      } else {
        fail(`env:${key}`, 'Missing — required when STORAGE_BACKEND=r2')
      }
    }
  } else {
    pass('env:STORAGE_BACKEND', `Using "${storageBackend}" backend — R2 vars not required`)
  }

  for (const { key, group } of optional.filter((v) => v.group !== 'storage')) {
    if (process.env[key]) {
      pass(`env:${key}`, 'Set')
    } else {
      warn(`env:${key}`, `Not set — ${group} features will be disabled`)
    }
  }
}

/* ── 2. Database connectivity ─────────────────────────────────── */
async function checkDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    fail('db:connectivity', 'Cannot test — Supabase env vars missing')
    return
  }

  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabase.from('users').select('count').limit(1).single()

    // PGRST116 = no rows, which is fine — DB is reachable
    if (error && error.code !== 'PGRST116') {
      fail('db:connectivity', `Query failed: ${error.message}`)
    } else {
      pass('db:connectivity', 'Database is reachable')
    }
  } catch (err) {
    fail('db:connectivity', `Connection error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/* ── 3. Storage connectivity ──────────────────────────────────── */
async function checkStorage() {
  const backend = process.env.STORAGE_BACKEND ?? 'r2'

  if (backend !== 'r2') {
    pass('storage:connectivity', `Using "${backend}" backend — skipping R2 check`)
    return
  }

  const accountId = process.env.R2_ACCOUNT_ID
  const bucket = process.env.R2_BUCKET_NAME
  const accessKey = process.env.R2_ACCESS_KEY_ID

  if (!accountId || !bucket || !accessKey) {
    fail('storage:connectivity', 'Cannot test — R2 env vars missing')
    return
  }

  try {
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.status < 500) {
      pass('storage:connectivity', `R2 bucket "${bucket}" reachable (status ${res.status})`)
    } else {
      fail('storage:connectivity', `R2 returned HTTP ${res.status}`)
    }
  } catch (err) {
    fail('storage:connectivity', `Connection error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/* ── 4. Email service connectivity ────────────────────────────── */
async function checkEmail() {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    warn('email:connectivity', 'RESEND_API_KEY not set — email notifications disabled')
    return
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      pass('email:connectivity', 'Resend API key valid and reachable')
    } else if (res.status === 401) {
      fail('email:connectivity', 'Resend API key is invalid (401 Unauthorized)')
    } else {
      warn('email:connectivity', `Resend returned HTTP ${res.status}`)
    }
  } catch (err) {
    fail('email:connectivity', `Connection error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/* ── Main ─────────────────────────────────────────────────────── */
async function main() {
  console.log(bold('\nDropSites — Configuration Validator\n'))

  checkEnvVars()
  await Promise.all([checkDatabase(), checkStorage(), checkEmail()])

  console.log('')
  for (const r of results) {
    const icon =
      r.status === 'pass' ? green('PASS') : r.status === 'warn' ? yellow('WARN') : red('FAIL')
    console.log(`  [${icon}] ${r.name} — ${r.message}`)
  }

  const failures = results.filter((r) => r.status === 'fail')
  const warnings = results.filter((r) => r.status === 'warn')

  console.log('')
  if (failures.length > 0) {
    console.log(red(`  ${failures.length} check(s) failed. Fix these before starting the app.\n`))
    process.exit(1)
  } else if (warnings.length > 0) {
    console.log(
      yellow(`  All required checks passed. ${warnings.length} warning(s) — optional services not configured.\n`),
    )
    process.exit(0)
  } else {
    console.log(green('  All checks passed. Configuration is valid.\n'))
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(red(`\n  Fatal error: ${err}\n`))
  process.exit(1)
})
