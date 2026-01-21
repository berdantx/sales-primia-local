-- Add indexes for better query performance on leads
CREATE INDEX IF NOT EXISTS idx_leads_client_created ON leads(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_page_url ON leads(page_url);

-- Add indexes on transaction tables for buyer_email matching
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_email ON transactions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_eduzz_transactions_buyer_email ON eduzz_transactions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tmb_transactions_buyer_email ON tmb_transactions(buyer_email);

-- Function to get aggregated lead statistics
CREATE OR REPLACE FUNCTION get_lead_stats(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
) RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_leads AS (
    SELECT * FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  )
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM filtered_leads),
    'by_source', COALESCE((
      SELECT json_object_agg(src, cnt)
      FROM (
        SELECT COALESCE(source, 'desconhecido') as src, COUNT(*) as cnt 
        FROM filtered_leads 
        GROUP BY COALESCE(source, 'desconhecido')
      ) s
    ), '{}'::json),
    'by_utm_source', COALESCE((
      SELECT json_object_agg(utm, cnt)
      FROM (
        SELECT COALESCE(utm_source, 'direto') as utm, COUNT(*) as cnt 
        FROM filtered_leads 
        GROUP BY COALESCE(utm_source, 'direto')
      ) u
    ), '{}'::json),
    'by_country', COALESCE((
      SELECT json_object_agg(country_name, cnt)
      FROM (
        SELECT COALESCE(country, 'Desconhecido') as country_name, COUNT(*) as cnt 
        FROM filtered_leads 
        GROUP BY COALESCE(country, 'Desconhecido')
      ) c
    ), '{}'::json),
    'by_day', COALESCE((
      SELECT json_object_agg(day, cnt)
      FROM (
        SELECT DATE(created_at)::text as day, COUNT(*) as cnt 
        FROM filtered_leads 
        WHERE created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      ) d
    ), '{}'::json),
    'by_city', COALESCE((
      SELECT json_object_agg(city_label, cnt)
      FROM (
        SELECT 
          CASE 
            WHEN region IS NOT NULL THEN city || ', ' || region 
            ELSE city 
          END as city_label, 
          COUNT(*) as cnt 
        FROM filtered_leads 
        WHERE city IS NOT NULL
        GROUP BY city, region
      ) ct
    ), '{}'::json)
  );
$$;

-- Function to get top UTM content/campaigns/pages
CREATE OR REPLACE FUNCTION get_top_ads(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_mode text DEFAULT 'ads',
  p_limit int DEFAULT 10
) RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_leads AS (
    SELECT * FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
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
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_lead_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_ads TO authenticated;