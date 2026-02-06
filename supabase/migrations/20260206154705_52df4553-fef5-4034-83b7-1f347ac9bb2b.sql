
-- Drop all versions of the conflicting functions
DROP FUNCTION IF EXISTS public.count_leads_for_export(text, text, text);
DROP FUNCTION IF EXISTS public.count_leads_for_export(uuid, timestamp with time zone, timestamp with time zone);

-- Recreate with TEXT parameters (matching how the client calls it)
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
  v_is_master boolean;
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
  WHERE
    (p_client_id IS NULL OR l.client_id = p_client_id::uuid)
    AND (p_start_date IS NULL OR l.created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date::timestamptz)
    AND (v_is_master OR l.client_id = ANY(v_allowed_clients));

  RETURN v_count;
END;
$$;

-- Also fix export_leads_batch if it has the same issue
DROP FUNCTION IF EXISTS public.export_leads_batch(text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.export_leads_batch(uuid, timestamp with time zone, timestamp with time zone, integer, integer);

CREATE OR REPLACE FUNCTION public.export_leads_batch(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 1000
)
RETURNS TABLE(
  created_at timestamptz,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  tags text,
  page_url text,
  country text,
  city text,
  traffic_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_user_id uuid;
  v_is_master boolean;
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
    SELECT array_agg(cu.client_id) INTO v_allowed_clients
    FROM client_users cu WHERE cu.user_id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT l.created_at, l.first_name, l.last_name, l.email, l.phone,
         l.source, l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content,
         l.tags, l.page_url, l.country, l.city, l.traffic_type
  FROM leads l
  WHERE
    (p_client_id IS NULL OR l.client_id = p_client_id::uuid)
    AND (p_start_date IS NULL OR l.created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date::timestamptz)
    AND (v_is_master OR l.client_id = ANY(v_allowed_clients))
  ORDER BY l.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;
