import { redirect } from 'next/navigation'

// Workspace overview redirects to settings page
export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/workspaces/${id}/settings`)
}
