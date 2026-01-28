
-- Fix get_lead_stats to use Brasília timezone for daily grouping
-- This ensures leads captured after 21:00 BRT (00:00 UTC) are attributed to the correct day

CREATE OR REPLACE FUNCTION public.get_lead_stats(
  p_client_id uuid, 
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_total bigint;
  v_by_source json;
  v_by_traffic_type json;
  v_by_utm_source json;
  v_by_utm_medium json;
  v_by_utm_campaign json;
  v_by_utm_content json;
  v_by_utm_term json;
  v_by_country json;
  v_by_city json;
  v_by_page json;
  v_by_day json;
BEGIN
  -- Use a CTE to filter once, then aggregate multiple times
  -- IMPORTANT: Convert created_at to Brasília timezone before extracting date
  WITH filtered_leads AS (
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
      -- Convert to Brasília timezone before casting to date
      (created_at AT TIME ZONE 'America/Sao_Paulo')::date as lead_date
    FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  )
  SELECT 
    COUNT(*),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(source, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY source ORDER BY c DESC LIMIT 50) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(traffic_type, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY traffic_type ORDER BY c DESC) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(utm_source, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY utm_source ORDER BY c DESC LIMIT 50) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(utm_medium, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY utm_medium ORDER BY c DESC LIMIT 50) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(utm_campaign, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY utm_campaign ORDER BY c DESC LIMIT 100) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(utm_content, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY utm_content ORDER BY c DESC LIMIT 100) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(utm_term, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY utm_term ORDER BY c DESC LIMIT 50) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(country, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY country ORDER BY c DESC LIMIT 50) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(city, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY city ORDER BY c DESC LIMIT 100) x), '{}'),
    COALESCE((SELECT json_object_agg(s, c) FROM (SELECT COALESCE(page_url, 'unknown') as s, COUNT(*) as c FROM filtered_leads GROUP BY page_url ORDER BY c DESC LIMIT 50) x), '{}'),
    COALESCE((SELECT json_object_agg(d, c) FROM (SELECT lead_date::text as d, COUNT(*) as c FROM filtered_leads GROUP BY lead_date ORDER BY lead_date) x), '{}')
  INTO 
    v_total,
    v_by_source,
    v_by_traffic_type,
    v_by_utm_source,
    v_by_utm_medium,
    v_by_utm_campaign,
    v_by_utm_content,
    v_by_utm_term,
    v_by_country,
    v_by_city,
    v_by_page,
    v_by_day
  FROM filtered_leads;

  result := json_build_object(
    'total', COALESCE(v_total, 0),
    'by_source', v_by_source,
    'by_traffic_type', v_by_traffic_type,
    'by_utm_source', v_by_utm_source,
    'by_utm_medium', v_by_utm_medium,
    'by_utm_campaign', v_by_utm_campaign,
    'by_utm_content', v_by_utm_content,
    'by_utm_term', v_by_utm_term,
    'by_country', v_by_country,
    'by_city', v_by_city,
    'by_page', v_by_page,
    'by_day', v_by_day
  );

  RETURN result;
END;
$function$;
