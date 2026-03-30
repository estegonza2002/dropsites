'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { UpgradePrompt } from './upgrade-prompt'

interface UsageGateProps {
  /** Human-readable feature name shown in the upgrade prompt. */
  feature: string
  /** Machine key for the feature gate check. */
  featureKey: string
  /** Workspace to check limits against. */
  workspaceId: string
  /** Content rendered when the feature is available. */
  children: ReactNode
}

/**
 * Wrapper component that checks if a feature is available for the
 * workspace's current plan. Shows an upgrade prompt if not.
 */
export function UsageGate({ feature, featureKey, workspaceId, children }: UsageGateProps) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [requiredPlan, setRequiredPlan] = useState('pro')

  useEffect(() => {
    async function check() {
      try {
        const resp = await fetch(
          `/api/v1/billing/feature-check?workspaceId=${encodeURIComponent(workspaceId)}&feature=${encodeURIComponent(featureKey)}`,
        )
        const json = await resp.json()
        setAvailable(json.available ?? false)
        if (json.requiredPlan) {
          setRequiredPlan(json.requiredPlan)
        }
      } catch {
        // On error, assume available to avoid blocking users
        setAvailable(true)
      }
    }
    check()
  }, [workspaceId, featureKey])

  if (available === null) {
    return <div className="animate-pulse h-8 rounded bg-muted" />
  }

  if (!available) {
    return <UpgradePrompt feature={feature} requiredPlan={requiredPlan} />
  }

  return <>{children}</>
}
