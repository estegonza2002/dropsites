-- cookie_consents: no foreign key deps
CREATE TABLE cookie_consents (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_agent       VARCHAR(512),
  ip_hash          VARCHAR(64),
  consent_version  VARCHAR(16)   NOT NULL,
  consented_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
