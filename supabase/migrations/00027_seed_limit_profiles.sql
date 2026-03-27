-- Seed: free / pro / team / enterprise limit profiles
INSERT INTO limit_profiles (
  name,
  max_deployments,
  max_deploy_size_bytes,
  max_total_storage_bytes,
  max_monthly_bandwidth_bytes,
  max_file_size_bytes,
  version_history_count,
  custom_domain_allowed,
  access_tokens_allowed,
  max_access_tokens,
  webhooks_allowed,
  api_rpm,
  api_daily_quota,
  api_monthly_quota,
  remove_badge,
  workspace_sso_allowed
) VALUES
  (
    'free',
    10,
    52428800,       -- 50 MB per deployment
    524288000,      -- 500 MB total storage
    10737418240,    -- 10 GB monthly bandwidth
    10485760,       -- 10 MB per file
    1,
    false, false, 0, false,
    0, 0, 0,
    false, false
  ),
  (
    'pro',
    100,
    524288000,      -- 500 MB per deployment
    10737418240,    -- 10 GB total storage
    107374182400,   -- 100 GB monthly bandwidth
    104857600,      -- 100 MB per file
    10,
    true, true, 25, true,
    60, 1000, 20000,
    true, false
  ),
  (
    'team',
    500,
    2147483648,     -- 2 GB per deployment
    107374182400,   -- 100 GB total storage
    -1,             -- unlimited bandwidth
    524288000,      -- 500 MB per file
    50,
    true, true, 100, true,
    300, 10000, 200000,
    true, true
  ),
  (
    'enterprise',
    -1,             -- unlimited deployments
    -1,             -- unlimited deploy size
    -1,             -- unlimited total storage
    -1,             -- unlimited bandwidth
    -1,             -- unlimited file size
    -1,             -- unlimited version history
    true, true, -1, true,
    -1, -1, -1,
    true, true
  )
ON CONFLICT (name) DO NOTHING;
