-- changelog_entries: no foreign key deps
CREATE TABLE changelog_entries (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(256)  NOT NULL,
  content      TEXT          NOT NULL,
  is_breaking  BOOLEAN       NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
