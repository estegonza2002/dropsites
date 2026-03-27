-- notification_log: depends on users
CREATE TABLE notification_log (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          REFERENCES users(id) ON DELETE SET NULL,
  event_type        VARCHAR(64)   NOT NULL,
  channel           VARCHAR(8)    NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient_masked  VARCHAR(256),
  status            VARCHAR(16)   CHECK (status IN ('sent', 'failed', 'rate_limited')),
  attempts          INTEGER       NOT NULL DEFAULT 1,
  provider_id       VARCHAR(256),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
