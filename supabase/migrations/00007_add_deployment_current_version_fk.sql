-- Resolve circular FK: deployments.current_version_id -> deployment_versions(id)
ALTER TABLE deployments
  ADD CONSTRAINT fk_deployments_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES deployment_versions(id)
  ON DELETE SET NULL;
