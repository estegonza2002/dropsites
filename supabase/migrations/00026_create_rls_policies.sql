-- Enable RLS on all tables
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
ALTER TABLE editor_locks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_reports      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users: own row only
-- ============================================================
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- workspaces: members only
-- ============================================================
CREATE POLICY workspaces_select_member ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY workspaces_update_owner ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- ============================================================
-- workspace_members: members can see, only owners can mutate
-- ============================================================
CREATE POLICY wm_select_member ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY wm_insert_owner ON workspace_members
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner' AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY wm_update_owner ON workspace_members
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner' AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY wm_delete_owner ON workspace_members
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner' AND accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- deployments: members can select; owners/publishers can insert/update; owners can delete
-- ============================================================
CREATE POLICY deployments_select_member ON deployments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY deployments_insert_publisher ON deployments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'publisher')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY deployments_update_publisher ON deployments
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'publisher')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY deployments_delete_owner ON deployments
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner' AND accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- deployment_versions: same workspace membership as deployments
-- ============================================================
CREATE POLICY dv_select_member ON deployment_versions
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- deployment_files: same as deployment_versions
-- ============================================================
CREATE POLICY df_select_member ON deployment_files
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- access_tokens: deployment owner or workspace owner
-- ============================================================
CREATE POLICY at_select_member ON access_tokens
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL
    )
  );

CREATE POLICY at_manage_owner ON access_tokens
  FOR ALL USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'publisher')
        AND wm.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- analytics_events: workspace membership
-- ============================================================
CREATE POLICY ae_select_member ON analytics_events
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- audit_log: workspace membership (read-only for users; service role writes)
-- ============================================================
CREATE POLICY audit_select_member ON audit_log
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- bandwidth_daily: workspace membership
-- ============================================================
CREATE POLICY bd_select_member ON bandwidth_daily
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- api_keys: own keys within workspace
-- ============================================================
CREATE POLICY ak_select_own ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ak_manage_own ON api_keys
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- webhook_endpoints: workspace membership
-- ============================================================
CREATE POLICY we_select_member ON webhook_endpoints
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY we_manage_owner ON webhook_endpoints
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'publisher') AND accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- editor_locks: workspace membership
-- ============================================================
CREATE POLICY el_select_member ON editor_locks
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM deployments d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL
    )
  );

CREATE POLICY el_manage_own ON editor_locks
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- abuse_reports: no user-facing read (service role only)
-- ============================================================
-- No policies added intentionally — only service role reads abuse_reports
