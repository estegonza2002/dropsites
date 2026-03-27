-- audit_log: depends on users, workspaces
CREATE TABLE audit_log (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID          REFERENCES users(id),
  workspace_id  UUID          REFERENCES workspaces(id),
  action        VARCHAR(64)   NOT NULL,
  resource_type VARCHAR(32),
  resource_id   UUID,
  metadata      JSONB,
  ip_hash       VARCHAR(64),
  occurred_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
