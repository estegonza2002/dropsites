-- Reconcile api_keys table schema.
-- Migration 00013 created the table with a `key_prefix` column.
-- Migration 00029 used IF NOT EXISTS (no-op) but the app expects `prefix` + `expires_at`.
-- This migration safely aligns the table to the application's expectations.

-- Rename key_prefix → prefix if the old column name is present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'key_prefix'
  ) THEN
    ALTER TABLE api_keys RENAME COLUMN key_prefix TO prefix;
  END IF;
END $$;

-- Add prefix column with a safe default if neither column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'prefix'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN prefix TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Change prefix type from VARCHAR(8) to TEXT if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'prefix'
      AND character_maximum_length = 8
  ) THEN
    ALTER TABLE api_keys ALTER COLUMN prefix TYPE TEXT;
  END IF;
END $$;

-- Add expires_at if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys (workspace_id);
