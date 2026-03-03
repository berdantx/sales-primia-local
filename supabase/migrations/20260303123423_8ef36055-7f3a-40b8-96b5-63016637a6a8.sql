
-- Drop old versions first to avoid ambiguity
DROP FUNCTION IF EXISTS public.count_leads_for_export(text, text, text);
DROP FUNCTION IF EXISTS public.export_leads_batch(text, text, text, integer, integer);

-- Recreate count_leads_for_export with advanced filters
CREATE OR REPLACE FUNCTION public.count_leads_for_export(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_utm_term text DEFAULT NULL,
  p_traffic_type text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_page_url text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $function$
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
    AND (p_source IS NULL OR l.source = p_source)
    AND (p_utm_source IS NULL OR l.utm_source = p_utm_source)
    AND (p_utm_medium IS NULL OR l.utm_medium = p_utm_medium)
    AND (p_utm_campaign IS NULL OR l.utm_campaign = p_utm_campaign)
    AND (p_utm_content IS NULL OR l.utm_content = p_utm_content)
    AND (p_utm_term IS NULL OR l.utm_term = p_utm_term)
    AND (p_traffic_type IS NULL OR l.traffic_type = p_traffic_type)
    AND (p_country IS NULL OR l.country = p_country)
    AND (p_page_url IS NULL OR l.page_url = p_page_url)
    AND (p_search IS NULL OR (
      lower(l.email) LIKE '%' || lower(p_search) || '%'
      OR lower(l.first_name) LIKE '%' || lower(p_search) || '%'
      OR lower(l.last_name) LIKE '%' || lower(p_search) || '%'
    ))
    AND (v_is_master OR l.client_id = ANY(v_allowed_clients));

  RETURN v_count;
END;
$function$;

-- Recreate export_leads_batch with advanced filters
CREATE OR REPLACE FUNCTION public.export_leads_batch(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 1000,
  p_source text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_utm_term text DEFAULT NULL,
  p_traffic_type text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_page_url text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(created_at timestamp with time zone, first_name text, last_name text, email text, phone text, source text, utm_source text, utm_medium text, utm_campaign text, utm_content text, tags text, page_url text, country text, city text, traffic_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $function$
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
    AND (p_source IS NULL OR l.source = p_source)
    AND (p_utm_source IS NULL OR l.utm_source = p_utm_source)
    AND (p_utm_medium IS NULL OR l.utm_medium = p_utm_medium)
    AND (p_utm_campaign IS NULL OR l.utm_campaign = p_utm_campaign)
    AND (p_utm_content IS NULL OR l.utm_content = p_utm_content)
    AND (p_utm_term IS NULL OR l.utm_term = p_utm_term)
    AND (p_traffic_type IS NULL OR l.traffic_type = p_traffic_type)
    AND (p_country IS NULL OR l.country = p_country)
    AND (p_page_url IS NULL OR l.page_url = p_page_url)
    AND (p_search IS NULL OR (
      lower(l.email) LIKE '%' || lower(p_search) || '%'
      OR lower(l.first_name) LIKE '%' || lower(p_search) || '%'
      OR lower(l.last_name) LIKE '%' || lower(p_search) || '%'
    ))
    AND (v_is_master OR l.client_id = ANY(v_allowed_clients))
  ORDER BY l.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$function$;
