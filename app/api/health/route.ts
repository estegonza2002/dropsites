import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ServiceStatus = 'healthy' | 'degraded' | 'down'

interface HealthResponse {
  status: ServiceStatus
  timestamp: string
  version: string
  services: {
    database: ServiceStatus
    storage: ServiceStatus
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('users').select('count').limit(1).single()
    // PGRST116 = no rows — that's fine, DB is reachable
    if (error && error.code !== 'PGRST116') {
      return 'down'
    }
    return 'healthy'
  } catch {
    return 'down'
  }
}

async function checkStorage(): Promise<ServiceStatus> {
  const accountId = process.env.R2_ACCOUNT_ID
  const bucket = process.env.R2_BUCKET_NAME
  const accessKey = process.env.R2_ACCESS_KEY_ID

  if (!accountId || !bucket || !accessKey) {
    // Storage not configured — skip check in dev
    return 'healthy'
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
    return res.status < 500 ? 'healthy' : 'down'
  } catch {
    return 'down'
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [database, storage] = await Promise.all([
    checkDatabase(),
    checkStorage(),
  ])

  const allHealthy = database === 'healthy' && storage === 'healthy'
  const anyDown = database === 'down' || storage === 'down'

  const status: ServiceStatus = allHealthy
    ? 'healthy'
    : anyDown
      ? 'down'
      : 'degraded'

  const body: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? '0.0.0',
    services: { database, storage },
  }

  return NextResponse.json(body, { status: status === 'healthy' ? 200 : 503 })
}
