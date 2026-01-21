-- Drop existing function and recreate with traffic_type
DROP FUNCTION IF EXISTS get_lead_stats(uuid, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_lead_stats(
  p_client_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total', (
      SELECT COUNT(*) FROM leads 
      WHERE client_id = p_client_id
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    'by_source', (
      SELECT COALESCE(json_object_agg(source, cnt), '{}')
      FROM (
        SELECT COALESCE(source, 'unknown') as source, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY source
      ) t
    ),
    'by_traffic_type', (
      SELECT COALESCE(json_object_agg(traffic_type, cnt), '{}')
      FROM (
        SELECT COALESCE(traffic_type, 'unknown') as traffic_type, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY traffic_type
      ) t
    ),
    'by_utm_source', (
      SELECT COALESCE(json_object_agg(utm_source, cnt), '{}')
      FROM (
        SELECT COALESCE(utm_source, 'unknown') as utm_source, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_source
      ) t
    ),
    'by_utm_medium', (
      SELECT COALESCE(json_object_agg(utm_medium, cnt), '{}')
      FROM (
        SELECT COALESCE(utm_medium, 'unknown') as utm_medium, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_medium
      ) t
    ),
    'by_utm_campaign', (
      SELECT COALESCE(json_object_agg(utm_campaign, cnt), '{}')
      FROM (
        SELECT COALESCE(utm_campaign, 'unknown') as utm_campaign, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_campaign
      ) t
    ),
    'by_utm_content', (
      SELECT COALESCE(json_object_agg(utm_content, cnt), '{}')
      FROM (
        SELECT COALESCE(utm_content, 'unknown') as utm_content, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_content
      ) t
    ),
    'by_utm_term', (
      SELECT COALESCE(json_object_agg(utm_term, cnt), '{}')
      FROM (
        SELECT COALESCE(utm_term, 'unknown') as utm_term, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_term
      ) t
    ),
    'by_country', (
      SELECT COALESCE(json_object_agg(country, cnt), '{}')
      FROM (
        SELECT COALESCE(country, 'unknown') as country, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY country
      ) t
    ),
    'by_city', (
      SELECT COALESCE(json_object_agg(city, cnt), '{}')
      FROM (
        SELECT COALESCE(city, 'unknown') as city, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY city
      ) t
    ),
    'by_page', (
      SELECT COALESCE(json_object_agg(page_url, cnt), '{}')
      FROM (
        SELECT COALESCE(page_url, 'unknown') as page_url, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY page_url
      ) t
    ),
    'by_day', (
      SELECT COALESCE(json_object_agg(day, cnt), '{}')
      FROM (
        SELECT DATE(created_at) as day, COUNT(*) as cnt
        FROM leads
        WHERE client_id = p_client_id
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY DATE(created_at)
        ORDER BY day
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;