// Auto-generated types will be placed here after running:
// supabase gen types typescript --local > lib/supabase/types.ts
// Hand-authored stubs below — replace entirely once the DB is running locally.

type DeploymentRow = {
  id: string
  slug: string
  namespace: string | null
  workspace_id: string
  owner_id: string
  entry_path: string
  storage_bytes: number
  file_count: number
  password_hash: string | null
  is_disabled: boolean
  is_admin_disabled: boolean
  classification: string
  allow_indexing: boolean
  auto_nav_enabled: boolean
  current_version_id: string | null
  health_status: string
  health_details: Record<string, unknown> | null
  health_checked_at: string | null
  expires_at: string | null
  dropsites_config: Record<string, unknown> | null
  total_views: number
  created_at: string
  updated_at: string
  archived_at: string | null
  last_viewed_at: string | null
}

type DeploymentVersionRow = {
  id: string
  deployment_id: string
  version_number: number
  storage_path: string
  storage_bytes: number
  file_count: number
  source: 'upload' | 'editor' | 'api'
  published_by: string | null
  created_at: string
}

type DeploymentFileRow = {
  id: string
  deployment_id: string
  version_id: string
  file_path: string
  mime_type: string
  size_bytes: number
  sha256_hash: string
  storage_key: string
}

type WorkspaceMemberRow = {
  id: string
  workspace_id: string
  user_id: string | null
  email: string
  role: 'owner' | 'publisher' | 'viewer'
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  invite_token: string | null
  invite_expires_at: string | null
  created_at: string
}

type ContentHashRow = {
  sha256_hash: string
  blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  first_seen_at: string
}

type UserRow = {
  id: string
  email: string
  display_name: string | null
  email_verified_at: string | null
  phone_number: string | null
  phone_verified_at: string | null
  notification_prefs: Record<string, unknown>
  referral_code: string | null
  referred_by: string | null
  tos_accepted_at: string | null
  tos_version: string | null
  onboarding_completed: boolean
  frozen_at: string | null
  suspended_at: string | null
  limit_profile: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type WorkspaceRow = {
  id: string
  name: string
  namespace_slug: string | null
  owner_id: string
  is_personal: boolean
  limit_profile: string
  trial_started_at: string | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  grace_period_ends_at: string | null
  previous_limit_profile: string | null
  data_region: string
  white_label_config: Record<string, unknown> | null
  sso_config: Record<string, unknown> | null
  default_deployment_settings: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type AuditLogRow = {
  id: string
  action: string
  actor_id: string | null
  target_id: string | null
  target_type: string | null
  details: Record<string, unknown> | null
  created_at: string
}

type AnalyticsEventRow = {
  id: string
  deployment_id: string
  created_at: string
  referrer_domain: string | null
  ua_class: string | null
  token_id: string | null
  country_code: string | null
  device_class: string | null
  browser_family: string | null
}

type AnalyticsShareTokenRow = {
  id: string
  deployment_id: string
  token: string
  created_by: string
  expires_at: string | null
  created_at: string
}

type CustomDomainRow = {
  id: string
  deployment_id: string
  workspace_id: string
  domain: string
  cname_target: string
  txt_record: string
  status: 'pending' | 'verified' | 'error'
  tls_cert: string | null
  tls_key: string | null
  tls_expires_at: string | null
  verified_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

type AccessTokenRow = {
  id: string
  deployment_id: string
  name: string
  token: string
  max_views: number | null
  view_count: number
  last_seen_at: string | null
  expires_at: string | null
  revoked_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

type LimitProfileRow = {
  name: string
  max_deployments: number | null
  max_deploy_size_bytes: number | null
  max_total_storage_bytes: number | null
  max_monthly_bandwidth_bytes: number | null
  max_file_size_bytes: number | null
  version_history_count: number
  custom_domain_allowed: boolean
  access_tokens_allowed: boolean
  max_access_tokens: number
  webhooks_allowed: boolean
  api_rpm: number
  api_daily_quota: number
  api_monthly_quota: number
  remove_badge: boolean
  workspace_sso_allowed: boolean
  updated_at: string
}

type BandwidthDailyRow = {
  deployment_id: string
  date: string
  bytes_served: number
  request_count: number
}

type ApiKeyRow = {
  id: string
  workspace_id: string
  user_id: string
  name: string
  prefix: string
  key_hash: string
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

type WebhookEndpointRow = {
  id: string
  workspace_id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

type WebhookDeliveryRow = {
  id: string
  endpoint_id: string
  event_type: string
  status_code: number | null
  response_body: string | null
  response_time_ms: number
  attempt_number: number
  success: boolean
  error: string | null
  created_at: string
}

type BetaInviteRow = {
  id: string
  email: string
  invite_code: string
  status: 'pending' | 'accepted' | 'expired'
  notes: string | null
  invited_at: string
  accepted_at: string | null
  created_by: string | null
}

type BetaFeedbackRow = {
  id: string
  user_id: string | null
  category: 'bug' | 'ux' | 'missing-feature' | 'positive'
  body: string
  page_url: string | null
  severity: 'p0' | 'p1' | 'p2' | 'p3' | null
  created_at: string
}

type EditorLockRow = {
  deployment_id: string
  user_id: string
  opened_at: string
  expires_at: string | null
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: {
          id: string
          email: string
          display_name?: string | null
          email_verified_at?: string | null
          tos_accepted_at?: string | null
          tos_version?: string | null
          limit_profile?: string
          notification_prefs?: Record<string, unknown>
          onboarding_completed?: boolean
        }
        Update: Partial<UserRow>
        Relationships: []
      }
      workspaces: {
        Row: WorkspaceRow
        Insert: {
          name: string
          owner_id: string
          namespace_slug?: string | null
          is_personal?: boolean
          limit_profile?: string
          trial_started_at?: string | null
          trial_ends_at?: string | null
        }
        Update: Partial<WorkspaceRow>
        Relationships: []
      }
      workspace_members: {
        Row: WorkspaceMemberRow
        Insert: {
          workspace_id: string
          email: string
          role: 'owner' | 'publisher' | 'viewer'
          user_id?: string | null
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
          invite_token?: string | null
          invite_expires_at?: string | null
        }
        Update: Partial<WorkspaceMemberRow>
        Relationships: []
      }
      deployments: {
        Row: DeploymentRow
        Insert: {
          slug: string
          workspace_id: string
          owner_id: string
          entry_path: string
          namespace?: string | null
          storage_bytes?: number
          file_count?: number
          password_hash?: string | null
          is_disabled?: boolean
          is_admin_disabled?: boolean
          classification?: string
          allow_indexing?: boolean
          auto_nav_enabled?: boolean
          current_version_id?: string | null
          expires_at?: string | null
        }
        Update: Partial<DeploymentRow>
        Relationships: []
      }
      deployment_versions: {
        Row: DeploymentVersionRow
        Insert: Omit<DeploymentVersionRow, 'id' | 'created_at'>
        Update: Partial<DeploymentVersionRow>
        Relationships: []
      }
      deployment_files: {
        Row: DeploymentFileRow
        Insert: Omit<DeploymentFileRow, 'id'>
        Update: Partial<DeploymentFileRow>
        Relationships: []
      }
      content_hashes: {
        Row: ContentHashRow
        Insert: { sha256_hash: string; blocked?: boolean; blocked_reason?: string | null }
        Update: Partial<ContentHashRow>
        Relationships: []
      }
      analytics_events: {
        Row: AnalyticsEventRow
        Insert: Omit<AnalyticsEventRow, 'id' | 'created_at'>
        Update: Partial<AnalyticsEventRow>
        Relationships: []
      }
      analytics_share_tokens: {
        Row: AnalyticsShareTokenRow
        Insert: {
          deployment_id: string
          token: string
          created_by: string
          expires_at?: string | null
        }
        Update: Partial<AnalyticsShareTokenRow>
        Relationships: []
      }
      custom_domains: {
        Row: CustomDomainRow
        Insert: {
          deployment_id: string
          workspace_id: string
          domain: string
          cname_target: string
          txt_record: string
          status?: 'pending' | 'verified' | 'error'
        }
        Update: Partial<CustomDomainRow>
        Relationships: []
      }
      access_tokens: {
        Row: AccessTokenRow
        Insert: {
          deployment_id: string
          name: string
          token: string
          created_by: string
          max_views?: number | null
          expires_at?: string | null
        }
        Update: Partial<AccessTokenRow>
        Relationships: []
      }
      audit_log: {
        Row: AuditLogRow
        Insert: Omit<AuditLogRow, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
      limit_profiles: {
        Row: LimitProfileRow
        Insert: Partial<LimitProfileRow> & { name: string }
        Update: Partial<LimitProfileRow>
        Relationships: []
      }
      bandwidth_daily: {
        Row: BandwidthDailyRow
        Insert: BandwidthDailyRow
        Update: Partial<BandwidthDailyRow>
        Relationships: []
      }
      editor_locks: {
        Row: EditorLockRow
        Insert: {
          deployment_id: string
          user_id: string
          opened_at?: string
          expires_at?: string | null
        }
        Update: Partial<EditorLockRow>
        Relationships: []
      }
      slug_redirects: {
        Row: {
          id: string
          old_slug: string
          old_namespace: string | null
          new_slug: string
          new_namespace: string | null
          deployment_id: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          old_slug: string
          old_namespace?: string | null
          new_slug: string
          new_namespace?: string | null
          deployment_id?: string | null
          expires_at: string
          created_at?: string
        }
        Update: Partial<{
          old_slug: string
          old_namespace: string | null
          new_slug: string
          new_namespace: string | null
          deployment_id: string | null
          expires_at: string
        }>
        Relationships: []
      }
      api_keys: {
        Row: ApiKeyRow
        Insert: {
          workspace_id: string
          user_id: string
          name: string
          prefix: string
          key_hash: string
          expires_at?: string | null
        }
        Update: Partial<ApiKeyRow>
        Relationships: []
      }
      abuse_reports: {
        Row: {
          id: string
          deployment_url: string
          deployment_slug: string | null
          reporter_email: string
          reason: string
          description: string
          status: string
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          deployment_url: string
          deployment_slug?: string | null
          reporter_email: string
          reason: string
          description: string
          status?: string
        }
        Update: Partial<{
          status: string
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: string | null
        }>
        Relationships: []
      }
      cookie_consents: {
        Row: {
          id: string
          user_agent: string | null
          ip_hash: string | null
          consent_version: string
          consented_at: string
        }
        Insert: {
          user_agent?: string | null
          ip_hash?: string | null
          consent_version: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      bot_filters: {
        Row: {
          id: string
          pattern: string
          category: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          pattern: string
          category?: string | null
          active?: boolean
        }
        Update: Partial<{ pattern: string; category: string | null; active: boolean }>
        Relationships: []
      }
      changelog_entries: {
        Row: {
          id: string
          title: string
          content: string
          is_breaking: boolean
          published_at: string
        }
        Insert: {
          title: string
          content: string
          is_breaking?: boolean
          published_at?: string
        }
        Update: Partial<{ title: string; content: string; is_breaking: boolean; published_at: string }>
        Relationships: []
      }
      webhook_endpoints: {
        Row: WebhookEndpointRow
        Insert: {
          workspace_id: string
          url: string
          secret: string
          events: string[]
          is_active?: boolean
        }
        Update: Partial<WebhookEndpointRow>
        Relationships: []
      }
      webhook_deliveries: {
        Row: WebhookDeliveryRow
        Insert: {
          endpoint_id: string
          event_type: string
          status_code?: number | null
          response_body?: string | null
          response_time_ms: number
          attempt_number: number
          success: boolean
          error?: string | null
        }
        Update: Partial<WebhookDeliveryRow>
        Relationships: []
      }
      beta_invites: {
        Row: BetaInviteRow
        Insert: {
          email: string
          invite_code?: string
          status?: 'pending' | 'accepted' | 'expired'
          notes?: string | null
          invited_at?: string
          accepted_at?: string | null
          created_by?: string | null
        }
        Update: Partial<BetaInviteRow>
        Relationships: []
      }
      beta_feedback: {
        Row: BetaFeedbackRow
        Insert: {
          user_id?: string | null
          category: 'bug' | 'ux' | 'missing-feature' | 'positive'
          body: string
          page_url?: string | null
          severity?: 'p0' | 'p1' | 'p2' | 'p3' | null
          created_at?: string
        }
        Update: Partial<BetaFeedbackRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_sessions: {
        Args: { user_uuid: string }
        Returns: Array<{
          id: string
          user_agent: string | null
          ip: string | null
          created_at: string
          updated_at: string
          not_after: string | null
        }>
      }
      terminate_session: {
        Args: { session_id: string }
        Returns: undefined
      }
      terminate_other_sessions: {
        Args: { user_uuid: string; keep_session_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
  }
}
