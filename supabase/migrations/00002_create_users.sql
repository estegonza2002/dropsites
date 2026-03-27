-- users: mirrors auth.users, no FK deps
CREATE TABLE users (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email                VARCHAR(256)  NOT NULL UNIQUE,
  display_name         VARCHAR(128),
  email_verified_at    TIMESTAMPTZ,
  phone_number         VARCHAR(32),
  phone_verified_at    TIMESTAMPTZ,
  notification_prefs   JSONB         NOT NULL DEFAULT '{}',
  referral_code        VARCHAR(32)   UNIQUE,
  referred_by          UUID          REFERENCES users(id) ON DELETE SET NULL,
  tos_accepted_at      TIMESTAMPTZ,
  tos_version          VARCHAR(16),
  onboarding_completed BOOLEAN       NOT NULL DEFAULT false,
  frozen_at            TIMESTAMPTZ,
  suspended_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);
