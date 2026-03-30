-- API Keys table for REST API authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast hash lookups during authentication
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);

-- Index for listing keys per workspace
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys (workspace_id);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Workspace members can read keys in their workspace
CREATE POLICY "workspace_members_read_api_keys" ON api_keys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = api_keys.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.accepted_at IS NOT NULL
    )
  );

-- Only workspace owners can create/update/delete keys
CREATE POLICY "workspace_owners_manage_api_keys" ON api_keys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = api_keys.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'owner'
        AND workspace_members.accepted_at IS NOT NULL
    )
  );
