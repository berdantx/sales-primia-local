-- Create optimized RPC for ad trend data (evolution chart)
-- This function aggregates lead counts by day/week directly in the database
-- to avoid fetching all leads to the frontend

CREATE OR REPLACE FUNCTION public.get_ad_trend_data(
  p_client_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_top_item_names TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_mode TEXT DEFAULT 'ads',
  p_group_by TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_is_master BOOLEAN;
  v_allowed_clients UUID[];
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Check if master user
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id AND role = 'master'
  ) INTO v_is_master;

  -- Get allowed clients for non-master users
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM client_users
    WHERE user_id = v_user_id;
    
    IF v_allowed_clients IS NULL OR array_length(v_allowed_clients, 1) IS NULL THEN
      RETURN '[]'::JSONB;
    END IF;
  END IF;

  -- Client access check
  IF p_client_id IS NOT NULL AND NOT v_is_master THEN
    IF NOT (p_client_id = ANY(v_allowed_clients)) THEN
      RETURN '[]'::JSONB;
    END IF;
  END IF;

  -- Return empty if no items to track
  IF array_length(p_top_item_names, 1) IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Build aggregation query based on mode
  IF p_mode = 'ads' THEN
    -- Aggregate by utm_content (ads)
    IF p_group_by = 'week' THEN
      SELECT jsonb_agg(row_data ORDER BY date_key)
      INTO v_result
      FROM (
        SELECT 
          DATE_TRUNC('week', created_at)::DATE as date_key,
          jsonb_object_agg(utm_content, lead_count) as item_counts
        FROM (
          SELECT 
            DATE_TRUNC('week', created_at) as week_start,
            created_at,
            utm_content,
            COUNT(*) as lead_count
          FROM leads
          WHERE created_at IS NOT NULL
            AND utm_content = ANY(p_top_item_names)
            AND (p_client_id IS NULL OR client_id = p_client_id)
            AND (v_is_master OR client_id = ANY(v_allowed_clients))
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
          GROUP BY DATE_TRUNC('week', created_at), created_at, utm_content
        ) sub
        GROUP BY DATE_TRUNC('week', created_at)::DATE
      ) grouped
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object('date', date_key) || item_counts as row_data
      ) final;
    ELSE
      SELECT jsonb_agg(row_data ORDER BY date_key)
      INTO v_result
      FROM (
        SELECT 
          created_at::DATE as date_key,
          jsonb_object_agg(utm_content, lead_count) as item_counts
        FROM (
          SELECT 
            created_at::DATE,
            utm_content,
            COUNT(*) as lead_count
          FROM leads
          WHERE created_at IS NOT NULL
            AND utm_content = ANY(p_top_item_names)
            AND (p_client_id IS NULL OR client_id = p_client_id)
            AND (v_is_master OR client_id = ANY(v_allowed_clients))
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
          GROUP BY created_at::DATE, utm_content
        ) sub
        GROUP BY created_at::DATE
      ) grouped
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object('date', date_key) || item_counts as row_data
      ) final;
    END IF;

  ELSIF p_mode = 'campaigns' THEN
    -- Aggregate by utm_campaign
    IF p_group_by = 'week' THEN
      SELECT jsonb_agg(row_data ORDER BY date_key)
      INTO v_result
      FROM (
        SELECT 
          DATE_TRUNC('week', created_at)::DATE as date_key,
          jsonb_object_agg(utm_campaign, lead_count) as item_counts
        FROM (
          SELECT 
            DATE_TRUNC('week', created_at) as week_start,
            created_at,
            utm_campaign,
            COUNT(*) as lead_count
          FROM leads
          WHERE created_at IS NOT NULL
            AND utm_campaign = ANY(p_top_item_names)
            AND (p_client_id IS NULL OR client_id = p_client_id)
            AND (v_is_master OR client_id = ANY(v_allowed_clients))
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
          GROUP BY DATE_TRUNC('week', created_at), created_at, utm_campaign
        ) sub
        GROUP BY DATE_TRUNC('week', created_at)::DATE
      ) grouped
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object('date', date_key) || item_counts as row_data
      ) final;
    ELSE
      SELECT jsonb_agg(row_data ORDER BY date_key)
      INTO v_result
      FROM (
        SELECT 
          created_at::DATE as date_key,
          jsonb_object_agg(utm_campaign, lead_count) as item_counts
        FROM (
          SELECT 
            created_at::DATE,
            utm_campaign,
            COUNT(*) as lead_count
          FROM leads
          WHERE created_at IS NOT NULL
            AND utm_campaign = ANY(p_top_item_names)
            AND (p_client_id IS NULL OR client_id = p_client_id)
            AND (v_is_master OR client_id = ANY(v_allowed_clients))
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
          GROUP BY created_at::DATE, utm_campaign
        ) sub
        GROUP BY created_at::DATE
      ) grouped
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object('date', date_key) || item_counts as row_data
      ) final;
    END IF;

  ELSE
    -- Mode 'pages' - aggregate by normalized page_url
    IF p_group_by = 'week' THEN
      SELECT jsonb_agg(row_data ORDER BY date_key)
      INTO v_result
      FROM (
        SELECT 
          DATE_TRUNC('week', created_at)::DATE as date_key,
          jsonb_object_agg(normalized_url, lead_count) as item_counts
        FROM (
          SELECT 
            DATE_TRUNC('week', created_at) as week_start,
            created_at,
            regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '') as normalized_url,
            COUNT(*) as lead_count
          FROM leads
          WHERE created_at IS NOT NULL
            AND page_url IS NOT NULL
            AND regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '') = ANY(p_top_item_names)
            AND (p_client_id IS NULL OR client_id = p_client_id)
            AND (v_is_master OR client_id = ANY(v_allowed_clients))
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
          GROUP BY DATE_TRUNC('week', created_at), created_at, regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '')
        ) sub
        GROUP BY DATE_TRUNC('week', created_at)::DATE
      ) grouped
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object('date', date_key) || item_counts as row_data
      ) final;
    ELSE
      SELECT jsonb_agg(row_data ORDER BY date_key)
      INTO v_result
      FROM (
        SELECT 
          created_at::DATE as date_key,
          jsonb_object_agg(normalized_url, lead_count) as item_counts
        FROM (
          SELECT 
            created_at::DATE,
            regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '') as normalized_url,
            COUNT(*) as lead_count
          FROM leads
          WHERE created_at IS NOT NULL
            AND page_url IS NOT NULL
            AND regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '') = ANY(p_top_item_names)
            AND (p_client_id IS NULL OR client_id = p_client_id)
            AND (v_is_master OR client_id = ANY(v_allowed_clients))
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
          GROUP BY created_at::DATE, regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '')
        ) sub
        GROUP BY created_at::DATE
      ) grouped
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object('date', date_key) || item_counts as row_data
      ) final;
    END IF;
  END IF;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;