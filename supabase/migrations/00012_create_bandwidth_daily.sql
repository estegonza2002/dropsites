-- bandwidth_daily: depends on deployments; composite PK
CREATE TABLE bandwidth_daily (
  deployment_id UUID    NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  date          DATE    NOT NULL,
  bytes_served  BIGINT  NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (deployment_id, date)
);
