'use client'

import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { TrialPrompt } from '@/components/onboarding/trial-prompt'

interface DashboardOnboardingProps {
  hasDeployments: boolean
  trialDayNumber?: number
  isTrialActive?: boolean
}

/**
 * Client wrapper for onboarding components on the dashboard page.
 * Passes deployment state down to the checklist for auto-completion.
 */
export function DashboardOnboarding({
  hasDeployments,
  trialDayNumber = 0,
  isTrialActive = false,
}: DashboardOnboardingProps) {
  return (
    <div className="space-y-4">
      <TrialPrompt trialDayNumber={trialDayNumber} isTrialActive={isTrialActive} />
      <OnboardingChecklist
        completedSteps={hasDeployments ? { uploaded: true } : undefined}
      />
    </div>
  )
}
