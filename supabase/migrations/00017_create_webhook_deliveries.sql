-- webhook_deliveries: depends on webhook_endpoints
CREATE TABLE webhook_deliveries (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id     UUID          REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
  event_type     VARCHAR(64)   NOT NULL,
  payload        JSONB         NOT NULL,
  response_code  INTEGER,
  response_body  TEXT,
  attempt_count  INTEGER       NOT NULL DEFAULT 1,
  status         VARCHAR(16)   CHECK (status IN ('pending', 'delivered', 'failed')),
  delivered_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
