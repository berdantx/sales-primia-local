
-- Fix get_landing_page_stats: fix GROUP BY bug and hidden pages calculation
DROP FUNCTION IF EXISTS public.get_landing_page_stats(text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_landing_page_stats(
  p_client_id text,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_min_leads integer DEFAULT 5,
  p_limit integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '15s'
AS $$
DECLARE
  v_client_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_result json;
BEGIN
  v_client_id := p_client_id::uuid;
  v_start := CASE WHEN p_start_date IS NOT NULL THEN p_start_date::timestamptz ELSE NULL END;
  v_end := CASE WHEN p_end_date IS NOT NULL THEN p_end_date::timestamptz ELSE NULL END;

  WITH page_stats AS (
    SELECT
      COALESCE(
        regexp_replace(regexp_replace(lower(page_url), 'https?://', ''), '/+$', ''),
        'direto'
      ) AS norm_url,
      count(*) AS lead_count,
      min(created_at)::text AS first_lead,
      max(created_at)::text AS last_lead
    FROM public.leads
    WHERE client_id = v_client_id
      AND (v_start IS NULL OR created_at >= v_start)
      AND (v_end IS NULL OR created_at <= v_end)
    GROUP BY norm_url
  )
  SELECT json_build_object(
    'stats', COALESCE((
      SELECT json_agg(row_to_json(t) ORDER BY t."leadCount" DESC)
      FROM (
        SELECT norm_url AS "normalizedUrl",
               norm_url AS "displayName",
               lead_count AS "leadCount",
               first_lead AS "firstLeadDate",
               last_lead AS "lastLeadDate"
        FROM page_stats
        WHERE lead_count >= p_min_leads
        ORDER BY lead_count DESC
        LIMIT p_limit
      ) t
    ), '[]'::json),
    'totalPages', (SELECT count(*) FROM page_stats)::int,
    'hiddenPages', (SELECT count(*) FROM page_stats WHERE lead_count < p_min_leads)::int
  ) INTO v_result;

  RETURN COALESCE(v_result, '{"stats":[],"totalPages":0,"hiddenPages":0}'::json);
END;
$$;

-- Optimize get_leads_paginated: remove raw_payload, add timeout, use faster count
DROP FUNCTION IF EXISTS public.get_leads_paginated(uuid, timestamptz, timestamptz, text, text, text, text, text, text, text, text, text, boolean, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_leads_paginated(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_utm_term text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_page_url text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_show_test_leads boolean DEFAULT true,
  p_traffic_type text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '15s'
AS $$
DECLARE
  result json;
  v_is_master boolean;
  v_allowed_clients uuid[];
  v_total_count bigint;
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND NOT (p_client_id = ANY(COALESCE(v_allowed_clients, ARRAY[]::uuid[]))) THEN
      RETURN json_build_object('leads', '[]'::json, 'totalCount', 0);
    END IF;
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO v_total_count
  FROM public.leads l
  WHERE (p_client_id IS NULL OR l.client_id = p_client_id)
    AND (v_is_master OR l.client_id = ANY(COALESCE(v_allowed_clients, ARRAY[]::uuid[])))
    AND (p_start_date IS NULL OR l.created_at >= p_start_date)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date)
    AND (p_source IS NULL OR p_source = 'all' OR l.source = p_source)
    AND (p_utm_source IS NULL OR p_utm_source = 'all' OR l.utm_source = p_utm_source)
    AND (p_utm_medium IS NULL OR p_utm_medium = 'all' OR l.utm_medium = p_utm_medium)
    AND (p_utm_campaign IS NULL OR p_utm_campaign = 'all' OR l.utm_campaign = p_utm_campaign)
    AND (p_utm_content IS NULL OR p_utm_content = 'all' OR l.utm_content = p_utm_content)
    AND (p_utm_term IS NULL OR p_utm_term = 'all' OR l.utm_term = p_utm_term)
    AND (p_country IS NULL OR p_country = 'all' OR l.country = p_country)
    AND (p_page_url IS NULL OR p_page_url = 'all' OR l.page_url ILIKE '%' || p_page_url || '%')
    AND (p_search IS NULL OR (
      l.email ILIKE '%' || p_search || '%' OR 
      l.first_name ILIKE '%' || p_search || '%' OR 
      l.last_name ILIKE '%' || p_search || '%' OR 
      l.phone ILIKE '%' || p_search || '%'
    ))
    AND (p_show_test_leads = true OR l.tags IS NULL OR l.tags NOT ILIKE '%test%')
    AND (p_traffic_type IS NULL OR l.traffic_type = p_traffic_type);

  -- Get paginated leads WITHOUT raw_payload for performance
  SELECT json_build_object(
    'leads', COALESCE(json_agg(row_to_json(lead_data)), '[]'::json),
    'totalCount', v_total_count
  ) INTO result
  FROM (
    SELECT 
      l.id, l.created_at, l.updated_at, l.client_id, l.external_id,
      l.email, l.first_name, l.last_name, l.phone, l.ip_address,
      l.organization, l.customer_account, l.tags,
      l.utm_source, l.utm_medium, l.utm_campaign, l.utm_id, l.utm_term, l.utm_content,
      l.source, l.page_url, l.series_id,
      l.country, l.country_code, l.city, l.region, l.traffic_type
    FROM public.leads l
    WHERE (p_client_id IS NULL OR l.client_id = p_client_id)
      AND (v_is_master OR l.client_id = ANY(COALESCE(v_allowed_clients, ARRAY[]::uuid[])))
      AND (p_start_date IS NULL OR l.created_at >= p_start_date)
      AND (p_end_date IS NULL OR l.created_at <= p_end_date)
      AND (p_source IS NULL OR p_source = 'all' OR l.source = p_source)
      AND (p_utm_source IS NULL OR p_utm_source = 'all' OR l.utm_source = p_utm_source)
      AND (p_utm_medium IS NULL OR p_utm_medium = 'all' OR l.utm_medium = p_utm_medium)
      AND (p_utm_campaign IS NULL OR p_utm_campaign = 'all' OR l.utm_campaign = p_utm_campaign)
      AND (p_utm_content IS NULL OR p_utm_content = 'all' OR l.utm_content = p_utm_content)
      AND (p_utm_term IS NULL OR p_utm_term = 'all' OR l.utm_term = p_utm_term)
      AND (p_country IS NULL OR p_country = 'all' OR l.country = p_country)
      AND (p_page_url IS NULL OR p_page_url = 'all' OR l.page_url ILIKE '%' || p_page_url || '%')
      AND (p_search IS NULL OR (
        l.email ILIKE '%' || p_search || '%' OR 
        l.first_name ILIKE '%' || p_search || '%' OR 
        l.last_name ILIKE '%' || p_search || '%' OR 
        l.phone ILIKE '%' || p_search || '%'
      ))
      AND (p_show_test_leads = true OR l.tags IS NULL OR l.tags NOT ILIKE '%test%')
      AND (p_traffic_type IS NULL OR l.traffic_type = p_traffic_type)
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) lead_data;

  RETURN result;
END;
$$;
