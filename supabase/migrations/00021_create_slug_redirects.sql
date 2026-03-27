-- slug_redirects: depends on deployments
-- Note: COALESCE expression not valid in PK definition; using surrogate PK + unique index
CREATE TABLE slug_redirects (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  old_slug      VARCHAR(128)  NOT NULL,
  old_namespace VARCHAR(64),
  new_slug      VARCHAR(128)  NOT NULL,
  new_namespace VARCHAR(64),
  deployment_id UUID          REFERENCES deployments(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ   NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_slug_redirects_old ON slug_redirects (old_slug, COALESCE(old_namespace, ''));
