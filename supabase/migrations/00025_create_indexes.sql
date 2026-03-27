-- users
CREATE UNIQUE INDEX idx_users_email        ON users (email);
CREATE UNIQUE INDEX idx_users_referral_code ON users (referral_code) WHERE referral_code IS NOT NULL;
CREATE        INDEX idx_users_created_at   ON users (created_at);

-- workspaces
CREATE UNIQUE INDEX idx_workspaces_namespace_slug ON workspaces (namespace_slug) WHERE deleted_at IS NULL;
CREATE        INDEX idx_workspaces_owner_id       ON workspaces (owner_id);

-- workspace_members
CREATE UNIQUE INDEX idx_wm_workspace_user  ON workspace_members (workspace_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_wm_invite_token    ON workspace_members (invite_token) WHERE invite_token IS NOT NULL;
CREATE        INDEX idx_wm_user_id         ON workspace_members (user_id);

-- deployments
CREATE UNIQUE INDEX idx_deployments_slug_namespace ON deployments (slug, COALESCE(namespace, '')) WHERE archived_at IS NULL;
CREATE        INDEX idx_deployments_workspace_id   ON deployments (workspace_id);
CREATE        INDEX idx_deployments_owner_id       ON deployments (owner_id);
CREATE        INDEX idx_deployments_expires_at     ON deployments (expires_at) WHERE expires_at IS NOT NULL;
CREATE        INDEX idx_deployments_last_viewed_at ON deployments (last_viewed_at);

-- deployment_versions
CREATE UNIQUE INDEX idx_dv_deployment_version ON deployment_versions (deployment_id, version_number);
CREATE        INDEX idx_dv_deployment_id      ON deployment_versions (deployment_id);

-- deployment_files
CREATE INDEX idx_df_deployment_version ON deployment_files (deployment_id, version_id);
CREATE INDEX idx_df_sha256             ON deployment_files (sha256_hash);

-- access_tokens
CREATE UNIQUE INDEX idx_at_token         ON access_tokens (token);
CREATE        INDEX idx_at_deployment_id ON access_tokens (deployment_id);

-- analytics_events
CREATE INDEX idx_ae_deployment_viewed ON analytics_events (deployment_id, viewed_at);
CREATE INDEX idx_ae_viewed_at         ON analytics_events (viewed_at);
CREATE INDEX idx_ae_access_token_id   ON analytics_events (access_token_id) WHERE access_token_id IS NOT NULL;

-- audit_log
CREATE INDEX idx_audit_workspace ON audit_log (workspace_id, occurred_at);
CREATE INDEX idx_audit_actor     ON audit_log (actor_id, occurred_at);
CREATE INDEX idx_audit_resource  ON audit_log (resource_type, resource_id);

-- bandwidth_daily
CREATE INDEX idx_bd_date ON bandwidth_daily (date);

-- api_keys
CREATE UNIQUE INDEX idx_ak_key_hash    ON api_keys (key_hash);
CREATE        INDEX idx_ak_workspace_id ON api_keys (workspace_id);

-- abuse_reports
CREATE INDEX idx_ar_status        ON abuse_reports (status);
CREATE INDEX idx_ar_deployment_id ON abuse_reports (deployment_id);
