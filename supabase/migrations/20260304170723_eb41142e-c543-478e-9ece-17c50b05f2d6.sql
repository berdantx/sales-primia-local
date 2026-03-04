DROP FUNCTION IF EXISTS public.get_lead_stats(text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.get_lead_stats(
  p_client_id text DEFAULT NULL::text,
  p_start_date text DEFAULT NULL::text,
  p_end_date text DEFAULT NULL::text,
  p_traffic_type text DEFAULT NULL::text,
  p_source text DEFAULT NULL::text,
  p_utm_source text DEFAULT NULL::text,
  p_utm_medium text DEFAULT NULL::text,
  p_utm_campaign text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_master boolean;
  v_allowed_clients uuid[];
  v_client_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_result json;
  v_empty json := json_build_object(
    'total', 0,
    'by_source', '{}'::json,
    'by_traffic_type', '{}'::json,
    'by_utm_source', '{}'::json,
    'by_utm_medium', '{}'::json,
    'by_utm_campaign', '{}'::json,
    'by_utm_content', '{}'::json,
    'by_utm_term', '{}'::json,
    'by_day', '{}'::json,
    'by_country', '{}'::json,
    'by_city', '{}'::json,
    'by_page', '{}'::json
  );
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_user_id
      AND role = 'master'
  ) INTO v_is_master;

  IF p_client_id IS NOT NULL AND p_client_id <> '' THEN
    v_client_id := p_client_id::uuid;
  END IF;

  IF p_start_date IS NOT NULL AND p_start_date <> '' THEN
    v_start := p_start_date::timestamptz;
  END IF;

  IF p_end_date IS NOT NULL AND p_end_date <> '' THEN
    v_end := p_end_date::timestamptz;
  END IF;

  IF NOT v_is_master THEN
    SELECT array_agg(cu.client_id)
    INTO v_allowed_clients
    FROM public.client_users cu
    WHERE cu.user_id = v_user_id;

    IF v_allowed_clients IS NULL OR array_length(v_allowed_clients, 1) IS NULL THEN
      RETURN v_empty;
    END IF;

    IF v_client_id IS NOT NULL AND NOT (v_client_id = ANY(v_allowed_clients)) THEN
      RETURN v_empty;
    END IF;
  END IF;

  WITH filtered AS (
    SELECT
      source,
      traffic_type,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      country,
      city,
      page_url,
      created_at::date AS lead_date
    FROM public.leads l
    WHERE (v_client_id IS NULL OR l.client_id = v_client_id)
      AND (v_start IS NULL OR l.created_at >= v_start)
      AND (v_end IS NULL OR l.created_at <= v_end)
      AND (p_traffic_type IS NULL OR p_traffic_type = '' OR l.traffic_type = p_traffic_type)
      AND (p_source IS NULL OR p_source = '' OR l.source = p_source)
      AND (p_utm_source IS NULL OR p_utm_source = '' OR l.utm_source = p_utm_source)
      AND (p_utm_medium IS NULL OR p_utm_medium = '' OR l.utm_medium = p_utm_medium)
      AND (p_utm_campaign IS NULL OR p_utm_campaign = '' OR l.utm_campaign = p_utm_campaign)
      AND (v_is_master OR l.client_id = ANY(v_allowed_clients))
  ),
  agg_source AS (
    SELECT json_object_agg(COALESCE(source, 'unknown'), cnt) AS val
    FROM (SELECT source, count(*) AS cnt FROM filtered GROUP BY source) s
  ),
  agg_traffic AS (
    SELECT json_object_agg(COALESCE(traffic_type, 'unknown'), cnt) AS val
    FROM (SELECT traffic_type, count(*) AS cnt FROM filtered GROUP BY traffic_type) s
  ),
  agg_utm_source AS (
    SELECT json_object_agg(COALESCE(utm_source, 'unknown'), cnt) AS val
    FROM (SELECT utm_source, count(*) AS cnt FROM filtered GROUP BY utm_source) s
  ),
  agg_utm_medium AS (
    SELECT json_object_agg(COALESCE(utm_medium, 'unknown'), cnt) AS val
    FROM (SELECT utm_medium, count(*) AS cnt FROM filtered GROUP BY utm_medium) s
  ),
  agg_utm_campaign AS (
    SELECT json_object_agg(COALESCE(utm_campaign, 'unknown'), cnt) AS val
    FROM (SELECT utm_campaign, count(*) AS cnt FROM filtered GROUP BY utm_campaign) s
  ),
  agg_utm_content AS (
    SELECT json_object_agg(COALESCE(utm_content, 'unknown'), cnt) AS val
    FROM (SELECT utm_content, count(*) AS cnt FROM filtered GROUP BY utm_content) s
  ),
  agg_utm_term AS (
    SELECT json_object_agg(COALESCE(utm_term, 'unknown'), cnt) AS val
    FROM (SELECT utm_term, count(*) AS cnt FROM filtered GROUP BY utm_term) s
  ),
  agg_day AS (
    SELECT json_object_agg(lead_date::text, cnt) AS val
    FROM (SELECT lead_date, count(*) AS cnt FROM filtered GROUP BY lead_date) s
  ),
  agg_country AS (
    SELECT json_object_agg(COALESCE(country, 'Não identificado'), cnt) AS val
    FROM (SELECT country, count(*) AS cnt FROM filtered GROUP BY country) s
  ),
  agg_city AS (
    SELECT json_object_agg(COALESCE(city, 'Não identificado'), cnt) AS val
    FROM (SELECT city, count(*) AS cnt FROM filtered GROUP BY city) s
  ),
  agg_page AS (
    SELECT json_object_agg(COALESCE(page_url, 'unknown'), cnt) AS val
    FROM (SELECT page_url, count(*) AS cnt FROM filtered GROUP BY page_url) s
  ),
  total_count AS (
    SELECT count(*) AS cnt FROM filtered
  )
  SELECT json_build_object(
    'total', COALESCE((SELECT cnt FROM total_count), 0),
    'by_source', COALESCE((SELECT val FROM agg_source), '{}'::json),
    'by_traffic_type', COALESCE((SELECT val FROM agg_traffic), '{}'::json),
    'by_utm_source', COALESCE((SELECT val FROM agg_utm_source), '{}'::json),
    'by_utm_medium', COALESCE((SELECT val FROM agg_utm_medium), '{}'::json),
    'by_utm_campaign', COALESCE((SELECT val FROM agg_utm_campaign), '{}'::json),
    'by_utm_content', COALESCE((SELECT val FROM agg_utm_content), '{}'::json),
    'by_utm_term', COALESCE((SELECT val FROM agg_utm_term), '{}'::json),
    'by_day', COALESCE((SELECT val FROM agg_day), '{}'::json),
    'by_country', COALESCE((SELECT val FROM agg_country), '{}'::json),
    'by_city', COALESCE((SELECT val FROM agg_city), '{}'::json),
    'by_page', COALESCE((SELECT val FROM agg_page), '{}'::json)
  ) INTO v_result;

  RETURN COALESCE(v_result, v_empty);
END;
$function$;