
CREATE OR REPLACE FUNCTION public.get_top_ads(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_mode text DEFAULT 'ads',
  p_limit integer DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '15s'
AS $$
DECLARE
  result json;
  v_is_master boolean;
  v_has_access boolean := false;
  v_total_count bigint;
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    IF p_client_id IS NULL THEN
      RETURN json_build_object('items', '[]'::json, 'totalCount', 0);
    END IF;
    
    SELECT EXISTS(
      SELECT 1 FROM public.client_users 
      WHERE user_id = auth.uid() AND client_id = p_client_id
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      RETURN json_build_object('items', '[]'::json, 'totalCount', 0);
    END IF;
  END IF;

  -- Single scan: get top items and total count together
  WITH grouped AS (
    SELECT 
      CASE p_mode
        WHEN 'ads' THEN utm_content
        WHEN 'campaigns' THEN utm_campaign
        WHEN 'pages' THEN split_part(split_part(page_url, '://', 2), '?', 1)
        ELSE utm_content
      END as name,
      COUNT(*) as cnt,
      MIN(created_at) as first_lead_date
    FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
      AND (
        (p_mode = 'ads' AND utm_content IS NOT NULL) OR
        (p_mode = 'campaigns' AND utm_campaign IS NOT NULL) OR
        (p_mode = 'pages' AND page_url IS NOT NULL) OR
        (p_mode NOT IN ('ads', 'campaigns', 'pages') AND utm_content IS NOT NULL)
      )
    GROUP BY name
  ),
  stats AS (
    SELECT COUNT(*) as total_distinct, SUM(cnt) as total_leads FROM grouped
  ),
  top_items AS (
    SELECT name, cnt, first_lead_date
    FROM grouped
    ORDER BY cnt DESC
    LIMIT p_limit
  )
  SELECT json_build_object(
    'items', COALESCE((
      SELECT json_agg(
        json_build_object(
          'name', t.name,
          'count', t.cnt,
          'percentage', ROUND((t.cnt::numeric / NULLIF(s.total_leads, 0)) * 100, 1),
          'firstLeadDate', t.first_lead_date,
          'isNew', t.first_lead_date > NOW() - INTERVAL '7 days'
        )
        ORDER BY t.cnt DESC
      )
      FROM top_items t, stats s
    ), '[]'::json),
    'totalCount', (SELECT total_distinct FROM stats)
  ) INTO result;

  RETURN result;
END;
$$;
