-- workspaces: depends on users, limit_profiles
CREATE TABLE workspaces (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        VARCHAR(128)  NOT NULL,
  namespace_slug              VARCHAR(64)   UNIQUE,
  owner_id                    UUID          NOT NULL REFERENCES users(id),
  is_personal                 BOOLEAN       NOT NULL DEFAULT false,
  limit_profile               VARCHAR(64)   NOT NULL DEFAULT 'free' REFERENCES limit_profiles(name),
  trial_started_at            TIMESTAMPTZ,
  trial_ends_at               TIMESTAMPTZ,
  stripe_customer_id          VARCHAR(256),
  stripe_subscription_id      VARCHAR(256),
  data_region                 VARCHAR(8)    NOT NULL DEFAULT 'us',
  white_label_config          JSONB,
  sso_config                  JSONB,
  default_deployment_settings JSONB         NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ
);
