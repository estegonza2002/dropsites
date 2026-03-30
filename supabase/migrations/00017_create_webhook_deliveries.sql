-- webhook_deliveries: depends on webhook_endpoints
CREATE TABLE webhook_deliveries (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id      UUID          REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
  event_type       VARCHAR(64)   NOT NULL,
  status_code      INTEGER,
  response_body    TEXT,
  response_time_ms INTEGER       NOT NULL DEFAULT 0,
  attempt_number   INTEGER       NOT NULL DEFAULT 1,
  success          BOOLEAN       NOT NULL DEFAULT false,
  error            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
