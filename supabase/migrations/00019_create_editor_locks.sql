-- editor_locks: composite PK on deployment_id, depends on deployments, users
CREATE TABLE editor_locks (
  deployment_id UUID          PRIMARY KEY REFERENCES deployments(id) ON DELETE CASCADE,
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opened_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ
);
