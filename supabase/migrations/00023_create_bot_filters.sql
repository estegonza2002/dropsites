-- bot_filters: no foreign key deps
CREATE TABLE bot_filters (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern    VARCHAR(256)  NOT NULL UNIQUE,
  category   VARCHAR(32),
  active     BOOLEAN       NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
