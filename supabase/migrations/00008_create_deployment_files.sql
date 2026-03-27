-- deployment_files: depends on deployments, deployment_versions
CREATE TABLE deployment_files (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID           NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  version_id    UUID           NOT NULL REFERENCES deployment_versions(id) ON DELETE CASCADE,
  file_path     VARCHAR(1024)  NOT NULL,
  mime_type     VARCHAR(128)   NOT NULL,
  size_bytes    BIGINT         NOT NULL,
  sha256_hash   VARCHAR(64)    NOT NULL,
  storage_key   VARCHAR(1024)  NOT NULL
);
