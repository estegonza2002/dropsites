import { createClient } from '@/lib/supabase/server'

export interface FeedbackPayload {
  category: 'bug' | 'ux' | 'missing-feature' | 'positive'
  body: string
  page_url?: string
  severity?: 'p0' | 'p1' | 'p2' | 'p3'
}

export interface BetaFeedback {
  id: string
  user_id: string | null
  category: string
  body: string
  page_url: string | null
  severity: string | null
  created_at: string
}

export async function submitFeedback(
  userId: string,
  payload: FeedbackPayload,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('beta_feedback')
    .insert({ user_id: userId, ...payload })

  if (error) throw new Error(error.message)
}

export async function listFeedback(filter?: {
  category?: string
  severity?: string
}): Promise<BetaFeedback[]> {
  const supabase = await createClient()
  let query = supabase
    .from('beta_feedback')
    .select()
    .order('created_at', { ascending: false })

  if (filter?.category) {
    query = query.eq('category', filter.category as 'bug' | 'ux' | 'missing-feature' | 'positive')
  }
  if (filter?.severity) {
    query = query.eq('severity', filter.severity as 'p0' | 'p1' | 'p2' | 'p3')
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as BetaFeedback[]
}
