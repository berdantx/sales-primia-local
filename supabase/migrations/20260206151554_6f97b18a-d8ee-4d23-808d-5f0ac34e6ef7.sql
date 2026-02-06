-- Add index to speed up export queries filtered by client_id + created_at
CREATE INDEX IF NOT EXISTS idx_leads_client_created ON leads (client_id, created_at DESC);

-- Recreate count function with increased timeout and simpler query
CREATE OR REPLACE FUNCTION public.count_leads_for_export(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_user_id uuid;
  v_is_master boolean := false;
  v_allowed_clients uuid[];
  v_count bigint;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'master'
  ) INTO v_is_master;

  IF NOT v_is_master THEN
    SELECT array_agg(client_id) INTO v_allowed_clients
    FROM client_users WHERE user_id = v_user_id;
  END IF;

  SELECT count(*) INTO v_count
  FROM leads l
  WHERE (p_client_id IS NULL OR l.client_id = p_client_id::uuid)
    AND (v_is_master OR l.client_id = ANY(v_allowed_clients))
    AND (p_start_date IS NULL OR l.created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date::timestamptz);

  RETURN v_count;
END;
$$;

-- Recreate batch function with increased timeout
CREATE OR REPLACE FUNCTION public.export_leads_batch(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 1000
)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_user_id uuid;
  v_is_master boolean := false;
  v_allowed_clients uuid[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'master'
  ) INTO v_is_master;

  IF NOT v_is_master THEN
    SELECT array_agg(client_id) INTO v_allowed_clients
    FROM client_users WHERE user_id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT l.*
  FROM leads l
  WHERE (p_client_id IS NULL OR l.client_id = p_client_id::uuid)
    AND (v_is_master OR l.client_id = ANY(v_allowed_clients))
    AND (p_start_date IS NULL OR l.created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date::timestamptz)
  ORDER BY l.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;