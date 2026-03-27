-- content_hashes: no foreign key deps
CREATE TABLE content_hashes (
  sha256_hash     VARCHAR(64)   PRIMARY KEY,
  blocked         BOOLEAN       NOT NULL DEFAULT false,
  blocked_at      TIMESTAMPTZ,
  blocked_reason  VARCHAR(64),
  first_seen_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
