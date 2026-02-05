-- Create optimized RPC for exporting leads without per-row RLS checks
CREATE OR REPLACE FUNCTION public.export_leads_batch(
  p_client_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
  created_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  tags TEXT,
  page_url TEXT,
  country TEXT,
  city TEXT,
  traffic_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_master BOOLEAN := FALSE;
  v_allowed_clients UUID[];
BEGIN
  -- Get user role
  SELECT role = 'master' INTO v_is_master
  FROM user_roles
  WHERE user_id = v_user_id;

  -- If not master, get allowed clients
  IF NOT v_is_master THEN
    SELECT array_agg(cu.client_id) INTO v_allowed_clients
    FROM client_users cu
    WHERE cu.user_id = v_user_id;
    
    -- Check access to the requested client
    IF p_client_id IS NOT NULL AND NOT (p_client_id = ANY(v_allowed_clients)) THEN
      RETURN; -- No access
    END IF;
  END IF;

  -- Return the leads batch with optimized access check
  RETURN QUERY
  SELECT
    l.created_at,
    l.first_name,
    l.last_name,
    l.email,
    l.phone,
    l.source,
    l.utm_source,
    l.utm_medium,
    l.utm_campaign,
    l.utm_content,
    l.tags,
    l.page_url,
    l.country,
    l.city,
    l.traffic_type
  FROM leads l
  WHERE
    (p_client_id IS NULL OR l.client_id = p_client_id)
    AND (p_start_date IS NULL OR l.created_at >= p_start_date)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date)
    AND (
      v_is_master
      OR l.client_id = ANY(v_allowed_clients)
    )
  ORDER BY l.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

-- Create count function for export
CREATE OR REPLACE FUNCTION public.count_leads_for_export(
  p_client_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_master BOOLEAN := FALSE;
  v_allowed_clients UUID[];
  v_count BIGINT;
BEGIN
  -- Get user role
  SELECT role = 'master' INTO v_is_master
  FROM user_roles
  WHERE user_id = v_user_id;

  -- If not master, get allowed clients
  IF NOT v_is_master THEN
    SELECT array_agg(cu.client_id) INTO v_allowed_clients
    FROM client_users cu
    WHERE cu.user_id = v_user_id;
    
    -- Check access to the requested client
    IF p_client_id IS NOT NULL AND NOT (p_client_id = ANY(v_allowed_clients)) THEN
      RETURN 0; -- No access
    END IF;
  END IF;

  -- Count with optimized access check
  SELECT COUNT(*) INTO v_count
  FROM leads l
  WHERE
    (p_client_id IS NULL OR l.client_id = p_client_id)
    AND (p_start_date IS NULL OR l.created_at >= p_start_date)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date)
    AND (
      v_is_master
      OR l.client_id = ANY(v_allowed_clients)
    );

  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.export_leads_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_leads_for_export TO authenticated;