-- Session helper functions (SECURITY DEFINER so service role can query auth schema)

-- Returns active sessions for a given user
CREATE OR REPLACE FUNCTION get_user_sessions(user_uuid uuid)
RETURNS TABLE (
  id           uuid,
  user_agent   text,
  ip           text,
  created_at   timestamptz,
  updated_at   timestamptz,
  not_after    timestamptz
)
SECURITY DEFINER
SET search_path = auth
LANGUAGE sql
AS $$
  SELECT
    id,
    user_agent,
    ip::text,
    created_at,
    updated_at,
    not_after
  FROM auth.sessions
  WHERE user_id = user_uuid
    AND (not_after IS NULL OR not_after > now())
  ORDER BY updated_at DESC;
$$;

-- Terminates a single session by ID
CREATE OR REPLACE FUNCTION terminate_session(session_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = auth
LANGUAGE sql
AS $$
  DELETE FROM auth.sessions WHERE id = session_id;
$$;

-- Terminates all sessions for a user except the given one
CREATE OR REPLACE FUNCTION terminate_other_sessions(user_uuid uuid, keep_session_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = auth
LANGUAGE sql
AS $$
  DELETE FROM auth.sessions
  WHERE user_id = user_uuid
    AND id <> keep_session_id;
$$;
