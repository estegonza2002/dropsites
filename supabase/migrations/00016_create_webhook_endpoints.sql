-- webhook_endpoints: depends on workspaces
CREATE TABLE webhook_endpoints (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID           NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url           VARCHAR(2048)  NOT NULL,
  secret        VARCHAR(256)   NOT NULL,
  events        TEXT[]         NOT NULL,
  is_active     BOOLEAN        NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);
