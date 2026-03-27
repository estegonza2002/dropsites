-- workspace_members: depends on workspaces, users
CREATE TABLE workspace_members (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id           UUID          REFERENCES users(id) ON DELETE CASCADE,
  email             VARCHAR(256)  NOT NULL,
  role              VARCHAR(16)   NOT NULL CHECK (role IN ('owner', 'publisher', 'viewer')),
  invited_by        UUID          REFERENCES users(id),
  invited_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  accepted_at       TIMESTAMPTZ,
  invite_token      VARCHAR(128)  UNIQUE,
  invite_expires_at TIMESTAMPTZ,

  UNIQUE (workspace_id, email)
);
