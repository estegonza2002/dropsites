-- ============================================================
-- Enable RLS on ALL tables
-- ============================================================
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_files   ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandwidth_daily    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_locks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_hashes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE limit_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE slug_redirects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_consents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_filters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: check if user is an accepted member of a workspace
-- Used in policy definitions for readability
-- ============================================================
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_workspace_role(ws_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = ANY(required_roles)
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- users: own row only
-- ============================================================
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- workspaces: accepted members can SELECT, only owners can UPDATE
-- ============================================================
CREATE POLICY workspaces_select_member ON workspaces
  FOR SELECT USING (is_workspace_member(id));

CREATE POLICY workspaces_update_owner ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- ============================================================
-- workspace_members: accepted members can see their workspace's members,
-- only owners can INSERT/UPDATE/DELETE
-- ============================================================
CREATE POLICY wm_select_member ON workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY wm_insert_owner ON workspace_members
  FOR INSERT WITH CHECK (
    is_workspace_role(workspace_id, ARRAY['owner'])
  );

CREATE POLICY wm_update_owner ON workspace_members
  FOR UPDATE USING (
    is_workspace_role(workspace_id, ARRAY['owner'])
  );

CREATE POLICY wm_delete_owner ON workspace_members
  FOR DELETE USING (
    is_workspace_role(workspace_id, ARRAY['owner'])
  );

-- ============================================================
-- deployments: accepted members can SELECT;
-- owners/publishers can INSERT/UPDATE; only owners can DELETE
-- ============================================================
CREATE POLICY deployments_select_member ON deployments
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY deployments_insert_publisher ON deployments
  FOR INSERT WITH CHECK (
    is_workspace_role(workspace_id, ARRAY['owner', 'publisher'])
  );

CREATE POLICY deployments_update_publisher ON deployments
  FOR UPDATE USING (
    is_workspace_role(workspace_id, ARRAY['owner', 'publisher'])
  );

CREATE POLICY deployments_delete_owner ON deployments
  FOR DELETE USING (
    is_workspace_role(workspace_id, ARRAY['owner'])
  );

-- ============================================================
-- deployment_versions: follows deployment workspace membership
-- Accepted members can SELECT; owners/publishers can INSERT
-- ============================================================
CREATE POLICY dv_select_member ON deployment_versions
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY dv_insert_publisher ON deployment_versions
  FOR INSERT WITH CHECK (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_role(d.workspace_id, ARRAY['owner', 'publisher'])
    )
  );

-- ============================================================
-- deployment_files: follows deployment workspace membership
-- Accepted members can SELECT; owners/publishers can INSERT
-- ============================================================
CREATE POLICY df_select_member ON deployment_files
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY df_insert_publisher ON deployment_files
  FOR INSERT WITH CHECK (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_role(d.workspace_id, ARRAY['owner', 'publisher'])
    )
  );

-- ============================================================
-- access_tokens: accepted members can SELECT;
-- owners/publishers can manage
-- ============================================================
CREATE POLICY at_select_member ON access_tokens
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY at_manage_publisher ON access_tokens
  FOR ALL USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_role(d.workspace_id, ARRAY['owner', 'publisher'])
    )
  );

-- ============================================================
-- analytics_events: accepted workspace members can SELECT
-- Only service role writes (no INSERT policy for users)
-- ============================================================
CREATE POLICY ae_select_member ON analytics_events
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

-- ============================================================
-- audit_log: accepted workspace members can SELECT (read-only)
-- Only service role writes (no INSERT/UPDATE/DELETE for users)
-- ============================================================
CREATE POLICY audit_select_member ON audit_log
  FOR SELECT USING (is_workspace_member(workspace_id));

-- ============================================================
-- bandwidth_daily: accepted workspace members can SELECT
-- ============================================================
CREATE POLICY bd_select_member ON bandwidth_daily
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

-- ============================================================
-- api_keys: users can manage their own keys only
-- ============================================================
CREATE POLICY ak_select_own ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ak_manage_own ON api_keys
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- webhook_endpoints: accepted members can SELECT;
-- owners/publishers can manage
-- ============================================================
CREATE POLICY we_select_member ON webhook_endpoints
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY we_manage_publisher ON webhook_endpoints
  FOR ALL USING (
    is_workspace_role(workspace_id, ARRAY['owner', 'publisher'])
  );

-- ============================================================
-- webhook_deliveries: readable by members of the webhook's workspace
-- Only service role writes
-- ============================================================
CREATE POLICY wd_select_member ON webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (
      SELECT we.id FROM webhook_endpoints we
      WHERE is_workspace_member(we.workspace_id)
    )
  );

-- ============================================================
-- editor_locks: accepted members can SELECT;
-- users can manage their own locks
-- ============================================================
CREATE POLICY el_select_member ON editor_locks
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY el_manage_own ON editor_locks
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- abuse_reports: no user-facing policies (service role only)
-- ============================================================
-- No policies intentionally — only service role reads/writes abuse_reports

-- ============================================================
-- content_hashes: no user-facing policies (service role only)
-- ============================================================
-- No policies intentionally — service role manages content hashes

-- ============================================================
-- limit_profiles: all authenticated users can SELECT (read-only reference data)
-- Only service role can INSERT/UPDATE/DELETE
-- ============================================================
CREATE POLICY lp_select_authenticated ON limit_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- slug_redirects: accepted workspace members (via deployment) can SELECT
-- Only service role writes
-- ============================================================
CREATE POLICY sr_select_member ON slug_redirects
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

-- ============================================================
-- notification_log: users can SELECT their own notifications
-- Only service role writes
-- ============================================================
CREATE POLICY nl_select_own ON notification_log
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- cookie_consents: no user-facing policies (service role only)
-- ============================================================
-- No policies intentionally — service role manages cookie consents

-- ============================================================
-- custom_domains: follows deployment workspace membership
-- Accepted members can SELECT; owners/publishers can manage
-- ============================================================
CREATE POLICY cd_select_member ON custom_domains
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY cd_manage_publisher ON custom_domains
  FOR ALL USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      WHERE is_workspace_role(d.workspace_id, ARRAY['owner', 'publisher'])
    )
  );

-- ============================================================
-- bot_filters: all authenticated users can SELECT (reference data)
-- Only service role manages
-- ============================================================
CREATE POLICY bf_select_authenticated ON bot_filters
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- changelog_entries: all authenticated users can SELECT (public info)
-- Only service role manages
-- ============================================================
CREATE POLICY ce_select_authenticated ON changelog_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);
