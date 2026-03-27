-- deployment_versions: depends on deployments, users
CREATE TABLE deployment_versions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id   UUID          NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  version_number  INTEGER       NOT NULL,
  storage_path    VARCHAR(1024) NOT NULL,
  storage_bytes   BIGINT        NOT NULL,
  file_count      INTEGER       NOT NULL,
  source          VARCHAR(16)   NOT NULL CHECK (source IN ('upload', 'editor', 'api')),
  published_by    UUID          REFERENCES users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
