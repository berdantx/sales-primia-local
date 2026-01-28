-- Fix get_top_ads to include user_has_client_access security check
-- This ensures it works properly for all clients like other RPC functions

CREATE OR REPLACE FUNCTION public.get_top_ads(
  p_client_id uuid DEFAULT NULL::uuid, 
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_mode text DEFAULT 'ads'::text, 
  p_limit integer DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Check client access if specific client is requested
  IF p_client_id IS NOT NULL AND NOT public.user_has_client_access(p_client_id) THEN
    RETURN json_build_object('items', '[]'::json, 'totalCount', 0);
  END IF;

  WITH filtered_leads AS (
    SELECT * FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ),
  grouped_data AS (
    SELECT 
      CASE p_mode
        WHEN 'ads' THEN COALESCE(utm_content, 'Sem UTM Content')
        WHEN 'campaigns' THEN COALESCE(utm_campaign, 'Sem Campanha')
        WHEN 'pages' THEN COALESCE(
          regexp_replace(
            regexp_replace(page_url, '^https?://', ''),
            '\?.*$', ''
          ), 
          'Sem Página'
        )
        ELSE COALESCE(utm_content, 'Sem UTM Content')
      END as name,
      COUNT(*) as count,
      MIN(created_at) as first_lead_date
    FROM filtered_leads
    WHERE (
      (p_mode = 'ads' AND utm_content IS NOT NULL) OR
      (p_mode = 'campaigns' AND utm_campaign IS NOT NULL) OR
      (p_mode = 'pages' AND page_url IS NOT NULL) OR
      (p_mode NOT IN ('ads', 'campaigns', 'pages') AND utm_content IS NOT NULL)
    )
    GROUP BY 
      CASE p_mode
        WHEN 'ads' THEN COALESCE(utm_content, 'Sem UTM Content')
        WHEN 'campaigns' THEN COALESCE(utm_campaign, 'Sem Campanha')
        WHEN 'pages' THEN COALESCE(
          regexp_replace(
            regexp_replace(page_url, '^https?://', ''),
            '\?.*$', ''
          ), 
          'Sem Página'
        )
        ELSE COALESCE(utm_content, 'Sem UTM Content')
      END
  ),
  total_count AS (
    SELECT COUNT(*) as total FROM filtered_leads
  )
  SELECT json_build_object(
    'items', COALESCE((
      SELECT json_agg(
        json_build_object(
          'name', name,
          'count', count,
          'percentage', ROUND((count::numeric / NULLIF((SELECT total FROM total_count), 0)) * 100, 1),
          'firstLeadDate', first_lead_date,
          'isNew', first_lead_date > NOW() - INTERVAL '7 days'
        )
        ORDER BY count DESC
      )
      FROM (SELECT * FROM grouped_data ORDER BY count DESC LIMIT p_limit) top
    ), '[]'::json),
    'totalCount', (SELECT COUNT(*) FROM grouped_data)
  ) INTO result;

  RETURN result;
END;
$function$;