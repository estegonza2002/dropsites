-- deployments: depends on workspaces, users
-- current_version_id FK added later (00007) to break circular dep with deployment_versions
CREATE TABLE deployments (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                VARCHAR(128)  NOT NULL,
  namespace           VARCHAR(64),
  workspace_id        UUID          NOT NULL REFERENCES workspaces(id),
  owner_id            UUID          NOT NULL REFERENCES users(id),
  entry_path          VARCHAR(512)  NOT NULL,
  storage_bytes       BIGINT        NOT NULL DEFAULT 0,
  file_count          INTEGER       NOT NULL DEFAULT 0,
  password_hash       VARCHAR(256),
  is_disabled         BOOLEAN       NOT NULL DEFAULT false,
  is_admin_disabled   BOOLEAN       NOT NULL DEFAULT false,
  classification      VARCHAR(16)   NOT NULL DEFAULT 'internal',
  allow_indexing      BOOLEAN       NOT NULL DEFAULT false,
  auto_nav_enabled    BOOLEAN       NOT NULL DEFAULT true,
  current_version_id  UUID,
  health_status       VARCHAR(16)   NOT NULL DEFAULT 'unknown',
  health_details      JSONB,
  health_checked_at   TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  dropsites_config    JSONB,
  total_views         BIGINT        NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  archived_at         TIMESTAMPTZ,
  last_viewed_at      TIMESTAMPTZ
);
