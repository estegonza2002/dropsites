-- access_tokens: depends on deployments
CREATE TABLE access_tokens (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id   UUID          NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  name            VARCHAR(128)  NOT NULL,
  token           VARCHAR(64)   NOT NULL UNIQUE,
  view_count      INTEGER       NOT NULL DEFAULT 0,
  max_views       INTEGER,
  expires_at      TIMESTAMPTZ,
  last_viewed_at  TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
