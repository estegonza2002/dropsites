import type { Database } from '@/lib/supabase/types'

export type WorkspaceRow = Pick<
  Database['public']['Tables']['workspaces']['Row'],
  'id' | 'name' | 'namespace_slug' | 'is_personal' | 'limit_profile' | 'owner_id' | 'created_at' | 'updated_at'
>
