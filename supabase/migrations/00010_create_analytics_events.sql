-- analytics_events: depends on deployments, access_tokens
CREATE TABLE analytics_events (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id    UUID          NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  viewed_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  referrer_domain  VARCHAR(256),
  user_agent_class VARCHAR(64),
  visitor_hash     VARCHAR(64),
  access_token_id  UUID          REFERENCES access_tokens(id) ON DELETE SET NULL,
  country_code     VARCHAR(2),
  device_class     VARCHAR(16),
  browser_family   VARCHAR(64),
  bytes_served     BIGINT
);
