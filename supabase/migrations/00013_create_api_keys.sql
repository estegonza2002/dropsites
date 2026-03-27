-- api_keys: depends on workspaces, users
CREATE TABLE api_keys (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(128)  NOT NULL,
  key_hash      VARCHAR(256)  NOT NULL UNIQUE,
  key_prefix    VARCHAR(8)    NOT NULL,
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
