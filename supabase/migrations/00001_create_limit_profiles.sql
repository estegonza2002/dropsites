-- limit_profiles: no foreign key deps, created first so workspaces can reference it
CREATE TABLE limit_profiles (
  name                        VARCHAR(64)   PRIMARY KEY,
  max_deployments             INTEGER,
  max_deploy_size_bytes       BIGINT,
  max_total_storage_bytes     BIGINT,
  max_monthly_bandwidth_bytes BIGINT,
  max_file_size_bytes         BIGINT,
  version_history_count       INTEGER       NOT NULL DEFAULT 1,
  custom_domain_allowed       BOOLEAN       NOT NULL DEFAULT false,
  access_tokens_allowed       BOOLEAN       NOT NULL DEFAULT false,
  max_access_tokens           INTEGER       NOT NULL DEFAULT 0,
  webhooks_allowed            BOOLEAN       NOT NULL DEFAULT false,
  api_rpm                     INTEGER       NOT NULL DEFAULT 0,
  api_daily_quota             INTEGER       NOT NULL DEFAULT 0,
  api_monthly_quota           INTEGER       NOT NULL DEFAULT 0,
  remove_badge                BOOLEAN       NOT NULL DEFAULT false,
  workspace_sso_allowed       BOOLEAN       NOT NULL DEFAULT false,
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
