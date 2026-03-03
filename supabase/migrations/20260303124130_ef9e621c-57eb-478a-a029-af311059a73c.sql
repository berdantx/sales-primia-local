
CREATE OR REPLACE FUNCTION public.get_lead_stats(p_client_id uuid, p_start_date timestamp with time zone DEFAULT NULL, p_end_date timestamp with time zone DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  result json;
  v_is_master boolean;
  v_has_access boolean := false;
  v_empty json;
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  v_empty := json_build_object(
    'total', 0,
    'by_source', '{}'::json,
    'by_traffic_type', '{}'::json,
    'by_utm_source', '{}'::json,
    'by_utm_medium', '{}'::json,
    'by_utm_campaign', '{}'::json,
    'by_utm_content', '{}'::json,
    'by_utm_term', '{}'::json,
    'by_country', '{}'::json,
    'by_city', '{}'::json,
    'by_page', '{}'::json,
    'by_day', '{}'::json
  );

  IF NOT v_is_master THEN
    IF p_client_id IS NULL THEN
      RETURN v_empty;
    END IF;
    
    SELECT EXISTS(
      SELECT 1 FROM public.client_users 
      WHERE user_id = auth.uid() AND client_id = p_client_id
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      RETURN v_empty;
    END IF;
  END IF;

  -- Single-pass aggregation for performance with large datasets
  WITH filtered AS (
    SELECT source, traffic_type, utm_source, utm_medium, utm_campaign, 
           utm_content, utm_term, country, city, page_url,
           created_at::date as lead_date
    FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ),
  agg_source AS (
    SELECT json_object_agg(COALESCE(source, 'unknown'), cnt) as val
    FROM (SELECT source, count(*) as cnt FROM filtered GROUP BY source) s
  ),
  agg_traffic AS (
    SELECT json_object_agg(COALESCE(traffic_type, 'unknown'), cnt) as val
    FROM (SELECT traffic_type, count(*) as cnt FROM filtered GROUP BY traffic_type) s
  ),
  agg_utm_source AS (
    SELECT json_object_agg(COALESCE(utm_source, 'unknown'), cnt) as val
    FROM (SELECT utm_source, count(*) as cnt FROM filtered GROUP BY utm_source) s
  ),
  agg_utm_medium AS (
    SELECT json_object_agg(COALESCE(utm_medium, 'unknown'), cnt) as val
    FROM (SELECT utm_medium, count(*) as cnt FROM filtered GROUP BY utm_medium) s
  ),
  agg_utm_campaign AS (
    SELECT json_object_agg(COALESCE(utm_campaign, 'unknown'), cnt) as val
    FROM (SELECT utm_campaign, count(*) as cnt FROM filtered GROUP BY utm_campaign) s
  ),
  agg_utm_content AS (
    SELECT json_object_agg(COALESCE(utm_content, 'unknown'), cnt) as val
    FROM (SELECT utm_content, count(*) as cnt FROM filtered GROUP BY utm_content) s
  ),
  agg_utm_term AS (
    SELECT json_object_agg(COALESCE(utm_term, 'unknown'), cnt) as val
    FROM (SELECT utm_term, count(*) as cnt FROM filtered GROUP BY utm_term) s
  ),
  agg_country AS (
    SELECT json_object_agg(COALESCE(country, 'Não identificado'), cnt) as val
    FROM (SELECT country, count(*) as cnt FROM filtered GROUP BY country) s
  ),
  agg_city AS (
    SELECT json_object_agg(COALESCE(city, 'Não identificado'), cnt) as val
    FROM (SELECT city, count(*) as cnt FROM filtered GROUP BY city) s
  ),
  agg_page AS (
    SELECT json_object_agg(COALESCE(page_url, 'unknown'), cnt) as val
    FROM (SELECT page_url, count(*) as cnt FROM filtered GROUP BY page_url) s
  ),
  agg_day AS (
    SELECT json_object_agg(lead_date::text, cnt) as val
    FROM (SELECT lead_date, count(*) as cnt FROM filtered GROUP BY lead_date) s
  ),
  total_count AS (
    SELECT count(*) as cnt FROM filtered
  )
  SELECT json_build_object(
    'total', (SELECT cnt FROM total_count),
    'by_source', COALESCE((SELECT val FROM agg_source), '{}'::json),
    'by_traffic_type', COALESCE((SELECT val FROM agg_traffic), '{}'::json),
    'by_utm_source', COALESCE((SELECT val FROM agg_utm_source), '{}'::json),
    'by_utm_medium', COALESCE((SELECT val FROM agg_utm_medium), '{}'::json),
    'by_utm_campaign', COALESCE((SELECT val FROM agg_utm_campaign), '{}'::json),
    'by_utm_content', COALESCE((SELECT val FROM agg_utm_content), '{}'::json),
    'by_utm_term', COALESCE((SELECT val FROM agg_utm_term), '{}'::json),
    'by_country', COALESCE((SELECT val FROM agg_country), '{}'::json),
    'by_city', COALESCE((SELECT val FROM agg_city), '{}'::json),
    'by_page', COALESCE((SELECT val FROM agg_page), '{}'::json),
    'by_day', COALESCE((SELECT val FROM agg_day), '{}'::json)
  ) INTO result;

  RETURN result;
END;
$function$;
