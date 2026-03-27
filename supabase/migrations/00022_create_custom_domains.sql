-- custom_domains: depends on deployments
CREATE TABLE custom_domains (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id       UUID          NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  domain              VARCHAR(256)  NOT NULL UNIQUE,
  verification_status VARCHAR(16)   NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'error')),
  cname_target        VARCHAR(256)  NOT NULL,
  tls_provisioned     BOOLEAN       NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  verified_at         TIMESTAMPTZ
);
