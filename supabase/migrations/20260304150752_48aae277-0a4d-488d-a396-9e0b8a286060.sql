CREATE OR REPLACE FUNCTION public.get_leads_paginated(
  p_client_id uuid DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
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
SET search_path = public
SET statement_timeout = '30s'
AS $$
DECLARE
  result json;
  v_is_master boolean;
  v_allowed_clients uuid[];
  v_total_count bigint := 0;
  v_leads json := '[]'::json;
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

  SELECT COUNT(*) INTO v_total_count
  FROM public.leads l
  WHERE (p_client_id IS NULL OR l.client_id = p_client_id)
    AND (v_is_master OR l.client_id = ANY(COALESCE(v_allowed_clients, ARRAY[]::uuid[])))
    AND (p_start_date IS NULL OR l.created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date::timestamptz)
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

  SELECT COALESCE(json_agg(json_build_object(
    'id', f.id, 'created_at', f.created_at, 'updated_at', f.updated_at,
    'client_id', f.client_id, 'external_id', f.external_id,
    'email', f.email, 'first_name', f.first_name, 'last_name', f.last_name,
    'phone', f.phone, 'ip_address', f.ip_address,
    'organization', f.organization, 'customer_account', f.customer_account,
    'tags', f.tags, 'utm_source', f.utm_source, 'utm_medium', f.utm_medium,
    'utm_campaign', f.utm_campaign, 'utm_id', f.utm_id, 'utm_term', f.utm_term,
    'utm_content', f.utm_content, 'source', f.source, 'page_url', f.page_url,
    'series_id', f.series_id, 'country', f.country, 'country_code', f.country_code,
    'city', f.city, 'region', f.region, 'traffic_type', f.traffic_type
  )), '[]'::json) INTO v_leads
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
      AND (p_start_date IS NULL OR l.created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR l.created_at <= p_end_date::timestamptz)
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
  ) f;

  result := json_build_object(
    'leads', COALESCE(v_leads, '[]'::json),
    'totalCount', COALESCE(v_total_count, 0)
  );

  RETURN result;
END;
$$;