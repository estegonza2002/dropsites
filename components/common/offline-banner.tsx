'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Banner shown when the browser is offline (navigator.onLine === false).
 * Automatically hides when connectivity is restored.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setOffline(false)
    }
    function handleOffline() {
      setOffline(true)
    }

    // Check initial state
    if (!navigator.onLine) {
      setOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-[var(--color-warning)] px-4 py-2 text-xs font-medium text-white"
    >
      <WifiOff className="h-3.5 w-3.5" strokeWidth={1.5} />
      You are offline. Some features may be unavailable.
    </div>
  )
}
