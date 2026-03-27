-- ============================================================
-- DropSites local dev seed data
-- Run after migrations via: supabase db reset
-- ============================================================

-- Test admin user (mirrors auth.users — insert via Supabase Auth in practice)
INSERT INTO users (
  id,
  email,
  display_name,
  email_verified_at,
  referral_code,
  tos_accepted_at,
  tos_version,
  onboarding_completed,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@dropsites.local',
  'Admin User',
  now(),
  'ADMIN001',
  now(),
  '1.0',
  true,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Personal workspace for admin
INSERT INTO workspaces (
  id,
  name,
  namespace_slug,
  owner_id,
  is_personal,
  limit_profile,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Admin Workspace',
  'admin',
  '00000000-0000-0000-0000-000000000001',
  true,
  'pro',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Owner membership
INSERT INTO workspace_members (
  id,
  workspace_id,
  user_id,
  email,
  role,
  accepted_at
) VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'admin@dropsites.local',
  'owner',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Sample deployment record (no actual files in R2)
INSERT INTO deployments (
  id,
  slug,
  workspace_id,
  owner_id,
  entry_path,
  storage_bytes,
  file_count,
  classification,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000030',
  'sample-site',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'index.html',
  1024,
  1,
  'internal',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Sample bot filter entries
INSERT INTO bot_filters (pattern, category, active) VALUES
  ('Googlebot', 'crawler', true),
  ('bingbot', 'crawler', true),
  ('Twitterbot', 'crawler', true),
  ('facebookexternalhit', 'crawler', true),
  ('LinkedInBot', 'crawler', true),
  ('Slackbot', 'crawler', true),
  ('curl/', 'api', true),
  ('python-requests', 'api', true),
  ('Go-http-client', 'api', true),
  ('ELB-HealthChecker', 'healthcheck', true)
ON CONFLICT (pattern) DO NOTHING;
