-- Add traffic filter parameters to get_lead_stats
DROP FUNCTION IF EXISTS public.get_lead_stats(text, text, text);

CREATE OR REPLACE FUNCTION public.get_lead_stats(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_traffic_type text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  v_result json;
  v_client_id uuid;
BEGIN
  IF p_client_id IS NOT NULL AND p_client_id <> '' THEN
    v_client_id := p_client_id::uuid;
  END IF;

  WITH filtered AS (
    SELECT *
    FROM public.leads
    WHERE (v_client_id IS NULL OR client_id = v_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= p_end_date::timestamptz)
      AND (p_traffic_type IS NULL OR traffic_type = p_traffic_type)
      AND (p_source IS NULL OR source = p_source)
      AND (p_utm_source IS NULL OR utm_source = p_utm_source)
      AND (p_utm_medium IS NULL OR utm_medium = p_utm_medium)
      AND (p_utm_campaign IS NULL OR utm_campaign = p_utm_campaign)
  ),
  agg AS (
    SELECT
      count(*)::int AS total,
      jsonb_object_agg(COALESCE(s, 'unknown'), s_count) FILTER (WHERE s IS NOT NULL) AS by_source,
      jsonb_object_agg(COALESCE(tt, 'unknown'), tt_count) FILTER (WHERE tt IS NOT NULL) AS by_traffic_type,
      jsonb_object_agg(COALESCE(us, 'unknown'), us_count) FILTER (WHERE us IS NOT NULL) AS by_utm_source,
      jsonb_object_agg(COALESCE(um, 'unknown'), um_count) FILTER (WHERE um IS NOT NULL) AS by_utm_medium,
      jsonb_object_agg(COALESCE(uc, 'unknown'), uc_count) FILTER (WHERE uc IS NOT NULL) AS by_utm_campaign,
      jsonb_object_agg(COALESCE(ucon, 'unknown'), ucon_count) FILTER (WHERE ucon IS NOT NULL) AS by_utm_content,
      jsonb_object_agg(COALESCE(ut, 'unknown'), ut_count) FILTER (WHERE ut IS NOT NULL) AS by_utm_term,
      jsonb_object_agg(COALESCE(d, 'unknown'), d_count) FILTER (WHERE d IS NOT NULL) AS by_day,
      jsonb_object_agg(COALESCE(co, 'Não identificado'), co_count) FILTER (WHERE co IS NOT NULL) AS by_country,
      jsonb_object_agg(COALESCE(ci, 'Não identificado'), ci_count) FILTER (WHERE ci IS NOT NULL) AS by_city,
      jsonb_object_agg(COALESCE(pg, 'unknown'), pg_count) FILTER (WHERE pg IS NOT NULL) AS by_page
    FROM (
      SELECT
        source AS s, count(*) FILTER (WHERE source IS NOT NULL) AS s_count,
        traffic_type AS tt, count(*) FILTER (WHERE traffic_type IS NOT NULL) AS tt_count,
        utm_source AS us, count(*) FILTER (WHERE utm_source IS NOT NULL) AS us_count,
        utm_medium AS um, count(*) FILTER (WHERE utm_medium IS NOT NULL) AS um_count,
        utm_campaign AS uc, count(*) FILTER (WHERE utm_campaign IS NOT NULL) AS uc_count,
        utm_content AS ucon, count(*) FILTER (WHERE utm_content IS NOT NULL) AS ucon_count,
        utm_term AS ut, count(*) FILTER (WHERE utm_term IS NOT NULL) AS ut_count,
        to_char(created_at, 'YYYY-MM-DD') AS d, count(*) AS d_count,
        country AS co, count(*) FILTER (WHERE country IS NOT NULL) AS co_count,
        city AS ci, count(*) FILTER (WHERE city IS NOT NULL) AS ci_count,
        page_url AS pg, count(*) FILTER (WHERE page_url IS NOT NULL) AS pg_count
      FROM filtered
      GROUP BY source, traffic_type, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
               to_char(created_at, 'YYYY-MM-DD'), country, city, page_url
    ) sub
  )
  SELECT json_build_object(
    'total', COALESCE(total, 0),
    'by_source', COALESCE(by_source, '{}'::jsonb),
    'by_traffic_type', COALESCE(by_traffic_type, '{}'::jsonb),
    'by_utm_source', COALESCE(by_utm_source, '{}'::jsonb),
    'by_utm_medium', COALESCE(by_utm_medium, '{}'::jsonb),
    'by_utm_campaign', COALESCE(by_utm_campaign, '{}'::jsonb),
    'by_utm_content', COALESCE(by_utm_content, '{}'::jsonb),
    'by_utm_term', COALESCE(by_utm_term, '{}'::jsonb),
    'by_day', COALESCE(by_day, '{}'::jsonb),
    'by_country', COALESCE(by_country, '{}'::jsonb),
    'by_city', COALESCE(by_city, '{}'::jsonb),
    'by_page', COALESCE(by_page, '{}'::jsonb)
  ) INTO v_result
  FROM agg;

  RETURN COALESCE(v_result, '{"total":0,"by_source":{},"by_traffic_type":{},"by_utm_source":{},"by_utm_medium":{},"by_utm_campaign":{},"by_utm_content":{},"by_utm_term":{},"by_day":{},"by_country":{},"by_city":{},"by_page":{}}'::json);
END;
$$;

-- Update cached version to accept new params and fallback
DROP FUNCTION IF EXISTS public.get_lead_stats_cached(text, text, text);

CREATE OR REPLACE FUNCTION public.get_lead_stats_cached(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_traffic_type text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_client_id uuid;
  v_has_advanced_filters boolean;
BEGIN
  v_has_advanced_filters := (p_traffic_type IS NOT NULL OR p_source IS NOT NULL OR p_utm_source IS NOT NULL OR p_utm_medium IS NOT NULL OR p_utm_campaign IS NOT NULL);

  IF p_start_date IS NULL AND p_end_date IS NULL AND NOT v_has_advanced_filters THEN
    IF p_client_id IS NOT NULL AND p_client_id <> '' THEN
      v_client_id := p_client_id::uuid;
    END IF;

    SELECT json_build_object(
      'total', COALESCE(SUM(lead_count), 0)::int,
      'by_source', COALESCE(jsonb_object_agg(source, lead_count) FILTER (WHERE source IS NOT NULL), '{}'::jsonb),
      'by_traffic_type', COALESCE(jsonb_object_agg(traffic_type, lead_count) FILTER (WHERE traffic_type IS NOT NULL), '{}'::jsonb),
      'by_utm_source', COALESCE(jsonb_object_agg(utm_source, lead_count) FILTER (WHERE utm_source IS NOT NULL), '{}'::jsonb),
      'by_utm_medium', '{}'::jsonb,
      'by_utm_campaign', '{}'::jsonb,
      'by_utm_content', '{}'::jsonb,
      'by_utm_term', '{}'::jsonb,
      'by_day', '{}'::jsonb,
      'by_country', '{}'::jsonb,
      'by_city', '{}'::jsonb,
      'by_page', '{}'::jsonb
    ) INTO v_result
    FROM public.mv_lead_stats
    WHERE (v_client_id IS NULL OR client_id = v_client_id);

    RETURN COALESCE(v_result, '{"total":0,"by_source":{},"by_traffic_type":{},"by_utm_source":{},"by_utm_medium":{},"by_utm_campaign":{},"by_utm_content":{},"by_utm_term":{},"by_day":{},"by_country":{},"by_city":{},"by_page":{}}'::json);
  END IF;

  RETURN public.get_lead_stats(p_client_id, p_start_date, p_end_date, p_traffic_type, p_source, p_utm_source, p_utm_medium, p_utm_campaign);
END;
$$;