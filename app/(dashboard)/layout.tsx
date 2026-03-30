import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { VerifyEmailBanner } from '@/components/auth/verify-email-banner'
import { TrialBanner } from '@/components/onboarding/trial-banner'
import { CookieConsentBanner } from '@/components/auth/cookie-consent-banner'
import { getTrialInfo } from '@/lib/auth/provision'
import type { WorkspaceRow } from '@/lib/auth/types'
import { BetaFeedbackButton } from '@/components/beta/feedback-button'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch workspaces the user belongs to
  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  let workspaces: WorkspaceRow[] = []
  if (workspaceIds.length > 0) {
    const { data } = await admin
      .from('workspaces')
      .select('id, name, namespace_slug, is_personal, limit_profile, owner_id, created_at, updated_at')
      .in('id', workspaceIds)
      .is('deleted_at', null)
      .order('is_personal', { ascending: false })
    workspaces = (data ?? []) as WorkspaceRow[]
  }

  // Resolve current workspace from cookie
  const cookieStore = await cookies()
  const cookieWsId = cookieStore.get('ds-workspace')?.value
  const currentWorkspaceId =
    (cookieWsId && workspaces.some((w) => w.id === cookieWsId) ? cookieWsId : null) ??
    workspaces.find((w) => w.is_personal)?.id ??
    workspaces[0]?.id

  const isEmailUnverified = !user.email_confirmed_at

  // Fetch trial info for the current workspace
  const trialInfo = currentWorkspaceId
    ? await getTrialInfo(currentWorkspaceId)
    : { isTrial: false, daysLeft: 0, trialEndsAt: null }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={user} workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav user={user} workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} />
        {isEmailUnverified && <VerifyEmailBanner />}
        {trialInfo.isTrial && trialInfo.trialEndsAt && (
          <TrialBanner daysLeft={trialInfo.daysLeft} trialEndsAt={trialInfo.trialEndsAt} />
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <CookieConsentBanner />
      <BetaFeedbackButton />
    </div>
  )
}
