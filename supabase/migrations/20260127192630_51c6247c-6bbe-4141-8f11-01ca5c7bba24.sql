-- Optimized get_lead_stats function using a single table scan
-- This replaces the previous version that did 13+ separate subqueries

CREATE OR REPLACE FUNCTION public.get_lead_stats(
  p_client_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
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
      created_at::date as lead_date
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

-- Also optimize get_top_ads function
CREATE OR REPLACE FUNCTION public.get_top_ads(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_mode text DEFAULT 'ads'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF p_mode = 'campaigns' THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]')
    INTO result
    FROM (
      SELECT 
        COALESCE(utm_campaign, 'Sem campanha') as name,
        COUNT(*) as leads,
        COUNT(DISTINCT lead_date) as days_active
      FROM (
        SELECT utm_campaign, created_at::date as lead_date
        FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
          AND utm_campaign IS NOT NULL
      ) sub
      GROUP BY utm_campaign
      ORDER BY leads DESC
      LIMIT p_limit
    ) t;
  ELSIF p_mode = 'countries' THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]')
    INTO result
    FROM (
      SELECT 
        COALESCE(country, 'Não identificado') as name,
        COUNT(*) as leads
      FROM leads
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
      GROUP BY country
      ORDER BY leads DESC
      LIMIT p_limit
    ) t;
  ELSE
    -- Default: ads mode (utm_content)
    SELECT COALESCE(json_agg(row_to_json(t)), '[]')
    INTO result
    FROM (
      SELECT 
        COALESCE(utm_content, 'Sem anúncio') as name,
        COUNT(*) as leads,
        COUNT(DISTINCT lead_date) as days_active
      FROM (
        SELECT utm_content, created_at::date as lead_date
        FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
          AND utm_content IS NOT NULL
      ) sub
      GROUP BY utm_content
      ORDER BY leads DESC
      LIMIT p_limit
    ) t;
  END IF;

  RETURN result;
END;
$function$;

-- Add composite index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_client_date_range ON leads(client_id, created_at) 
WHERE client_id IS NOT NULL;

-- Add index for utm_campaign queries
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON leads(utm_campaign) 
WHERE utm_campaign IS NOT NULL;