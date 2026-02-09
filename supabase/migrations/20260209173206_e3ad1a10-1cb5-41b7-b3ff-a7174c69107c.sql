
-- RPC to get funnel evolution data (aggregated by day/week) without downloading all leads
CREATE OR REPLACE FUNCTION public.get_funnel_evolution(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_group_by text DEFAULT 'day'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Security check: verify user has access to client
  IF p_client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM client_users WHERE client_id = p_client_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('master', 'admin')
    ) THEN
      RETURN '[]'::jsonb;
    END IF;
  END IF;

  WITH lead_data AS (
    SELECT
      CASE 
        WHEN p_group_by = 'week' THEN date_trunc('week', l.created_at)::date
        ELSE l.created_at::date
      END AS period_date,
      l.email,
      l.phone,
      l.utm_source,
      l.utm_medium,
      l.utm_campaign
    FROM leads l
    WHERE (p_client_id IS NULL OR l.client_id = p_client_id)
      AND (p_start_date IS NULL OR l.created_at >= p_start_date)
      AND (p_end_date IS NULL OR l.created_at <= p_end_date)
  ),
  -- Get all converted emails (from all 3 transaction tables)
  converted_contacts AS (
    SELECT DISTINCT lower(trim(buyer_email)) AS contact_email
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND buyer_email IS NOT NULL AND buyer_email != ''
    UNION
    SELECT DISTINCT lower(trim(buyer_email))
    FROM eduzz_transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND buyer_email IS NOT NULL AND buyer_email != ''
    UNION
    SELECT DISTINCT lower(trim(buyer_email))
    FROM tmb_transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND buyer_email IS NOT NULL AND buyer_email != ''
  ),
  aggregated AS (
    SELECT
      ld.period_date,
      count(*) AS total_leads,
      count(*) FILTER (WHERE ld.utm_source IS NOT NULL AND ld.utm_medium IS NOT NULL AND ld.utm_campaign IS NOT NULL) AS qualified_leads,
      count(DISTINCT ld.email) FILTER (WHERE lower(trim(ld.email)) IN (SELECT contact_email FROM converted_contacts)) AS converted_leads
    FROM lead_data ld
    GROUP BY ld.period_date
    ORDER BY ld.period_date
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'date', to_char(a.period_date, 'YYYY-MM-DD'),
      'totalLeads', a.total_leads,
      'qualifiedLeads', a.qualified_leads,
      'convertedLeads', a.converted_leads,
      'qualificationRate', CASE WHEN a.total_leads > 0 THEN round((a.qualified_leads::numeric / a.total_leads) * 100, 2) ELSE 0 END,
      'conversionRate', CASE WHEN a.total_leads > 0 THEN round((a.converted_leads::numeric / a.total_leads) * 100, 2) ELSE 0 END,
      'qualifiedConversionRate', CASE WHEN a.qualified_leads > 0 THEN round((a.converted_leads::numeric / a.qualified_leads) * 100, 2) ELSE 0 END
    )
  ), '[]'::jsonb) INTO v_result
  FROM aggregated a;

  RETURN v_result;
END;
$$;

-- RPC to get landing page stats aggregated in the database
CREATE OR REPLACE FUNCTION public.get_landing_page_stats(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_min_leads int DEFAULT 5,
  p_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Security check
  IF p_client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM client_users WHERE client_id = p_client_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('master', 'admin')
    ) THEN
      RETURN jsonb_build_object('stats', '[]'::jsonb, 'totalPages', 0, 'hiddenPages', 0);
    END IF;
  END IF;

  WITH page_leads AS (
    SELECT
      -- Normalize URL: remove protocol, www, trailing slash, query params
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(page_url, '^https?://(www\.)?', ''),
            '\?.*$', ''
          ),
          '/$', ''
        ),
        '#.*$', ''
      ) AS normalized_url,
      count(*) AS lead_count,
      min(created_at) AS first_lead,
      max(created_at) AS last_lead
    FROM leads
    WHERE page_url IS NOT NULL AND page_url != ''
      AND (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY normalized_url
  ),
  total_counts AS (
    SELECT 
      count(*) AS total_pages,
      count(*) FILTER (WHERE lead_count < p_min_leads) AS hidden_pages
    FROM page_leads
  )
  SELECT jsonb_build_object(
    'stats', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'normalizedUrl', pl.normalized_url,
          'displayName', pl.normalized_url,
          'leadCount', pl.lead_count,
          'firstLeadDate', pl.first_lead,
          'lastLeadDate', pl.last_lead
        )
        ORDER BY pl.lead_count DESC
      )
      FROM page_leads pl
      WHERE pl.lead_count >= p_min_leads
      LIMIT p_limit
    ), '[]'::jsonb),
    'totalPages', (SELECT total_pages FROM total_counts),
    'hiddenPages', (SELECT hidden_pages FROM total_counts)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
