-- abuse_reports: depends on deployments, users
CREATE TABLE abuse_reports (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id  UUID          NOT NULL REFERENCES deployments(id),
  reporter_email VARCHAR(256)  NOT NULL,
  reason         VARCHAR(32)   NOT NULL CHECK (reason IN ('phishing', 'malware', 'csam', 'copyright', 'other')),
  description    TEXT,
  status         VARCHAR(16)   NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'confirmed', 'dismissed')),
  resolved_by    UUID          REFERENCES users(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
