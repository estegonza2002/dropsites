'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

type LockState = {
  /** Whether a lock is active on this deployment */
  locked: boolean
  /** Whether the current user holds the lock */
  isOwnLock: boolean
  /** User ID of the lock holder */
  lockedBy: string | null
  /** Email of the lock holder */
  lockedByEmail: string | null
  /** Display name of the lock holder */
  lockedByName: string | null
  /** Whether the current user should be in read-only mode */
  readOnly: boolean
  /** Lock expiry timestamp */
  expiresAt: string | null
  /** Any error encountered */
  error: string | null
  /** Whether the initial lock acquisition is still pending */
  loading: boolean
}

type UseEditorLockOptions = {
  slug: string
  enabled?: boolean
}

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function useEditorLock({ slug, enabled = true }: UseEditorLockOptions): LockState {
  const [state, setState] = useState<LockState>({
    locked: false,
    isOwnLock: false,
    lockedBy: null,
    lockedByEmail: null,
    lockedByName: null,
    readOnly: false,
    expiresAt: null,
    error: null,
    loading: true,
  })

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const acquireLock = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/deployments/${slug}/lock`, {
        method: 'POST',
      })

      if (!mountedRef.current) return

      if (res.status === 409) {
        // Lock held by another user
        const data = await res.json()
        setState({
          locked: true,
          isOwnLock: false,
          lockedBy: data.locked_by,
          lockedByEmail: data.locked_by_email,
          lockedByName: data.locked_by_name,
          readOnly: true,
          expiresAt: data.expires_at,
          error: null,
          loading: false,
        })
        return
      }

      if (res.status === 403) {
        // Viewer — read-only
        setState({
          locked: false,
          isOwnLock: false,
          lockedBy: null,
          lockedByEmail: null,
          lockedByName: null,
          readOnly: true,
          expiresAt: null,
          error: null,
          loading: false,
        })
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        setState(prev => ({
          ...prev,
          error: data.error || 'Failed to acquire lock',
          loading: false,
        }))
        return
      }

      const data = await res.json()
      setState({
        locked: true,
        isOwnLock: true,
        lockedBy: null,
        lockedByEmail: null,
        lockedByName: null,
        readOnly: false,
        expiresAt: data.lock?.expires_at ?? null,
        error: null,
        loading: false,
      })
    } catch (err) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Network error',
          loading: false,
        }))
      }
    }
  }, [slug])

  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/deployments/${slug}/lock/heartbeat`, {
        method: 'POST',
      })
      if (res.ok && mountedRef.current) {
        const data = await res.json()
        setState(prev => ({
          ...prev,
          expiresAt: data.expires_at ?? prev.expiresAt,
        }))
      }
    } catch {
      // Heartbeat failure is non-fatal; lock will expire naturally
    }
  }, [slug])

  const releaseLock = useCallback(async () => {
    try {
      await fetch(`/api/v1/deployments/${slug}/lock`, {
        method: 'DELETE',
      })
    } catch {
      // Best-effort release; lock will expire naturally
    }
  }, [slug])

  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    mountedRef.current = true
    acquireLock()

    // Start heartbeat
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    return () => {
      mountedRef.current = false

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }

      // Release lock on unmount (best-effort, non-blocking)
      releaseLock()
    }
  }, [enabled, acquireLock, sendHeartbeat, releaseLock])

  return state
}
