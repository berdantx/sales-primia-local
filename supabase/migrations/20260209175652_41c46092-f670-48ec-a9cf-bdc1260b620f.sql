
-- Drop and recreate get_landing_page_stats with optimization
DROP FUNCTION IF EXISTS public.get_landing_page_stats(uuid, text, text, int, int);

CREATE OR REPLACE FUNCTION public.get_landing_page_stats(
  p_client_id uuid DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_min_leads int DEFAULT 5,
  p_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '15s'
AS $$
DECLARE
  v_result jsonb;
  v_total_pages int;
  v_hidden_pages int;
BEGIN
  -- Use a simple CTE with direct aggregation
  WITH page_stats AS (
    SELECT 
      LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(page_url, '\\?.*$', ''),
        '/$', ''
      )) AS normalized_url,
      COUNT(*) AS lead_count,
      MIN(created_at) AS first_lead_date,
      MAX(created_at) AS last_lead_date
    FROM leads
    WHERE page_url IS NOT NULL
      AND page_url != ''
      AND (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= p_end_date::timestamptz)
    GROUP BY 1
  ),
  counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE lead_count >= p_min_leads) AS visible,
      COUNT(*) FILTER (WHERE lead_count < p_min_leads) AS hidden
    FROM page_stats
  )
  SELECT 
    jsonb_build_object(
      'stats', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'normalizedUrl', ps.normalized_url,
          'displayName', ps.normalized_url,
          'leadCount', ps.lead_count,
          'firstLeadDate', ps.first_lead_date,
          'lastLeadDate', ps.last_lead_date
        ) ORDER BY ps.lead_count DESC)
        FROM page_stats ps
        WHERE ps.lead_count >= p_min_leads
        LIMIT p_limit
      ), '[]'::jsonb),
      'totalPages', c.visible,
      'hiddenPages', c.hidden
    )
  INTO v_result
  FROM counts c;

  RETURN COALESCE(v_result, '{"stats":[],"totalPages":0,"hiddenPages":0}'::jsonb);
END;
$$;

-- Create conversion summary RPC that does ALL conversion matching server-side
CREATE OR REPLACE FUNCTION public.get_conversion_summary(
  p_client_id uuid DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '20s'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH filtered_leads AS (
    SELECT 
      id,
      LOWER(TRIM(COALESCE(email, ''))) AS norm_email,
      REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g') AS raw_phone,
      page_url,
      utm_source,
      utm_medium,
      utm_campaign
    FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= p_end_date::timestamptz)
  ),
  leads_with_phone AS (
    SELECT *,
      CASE WHEN LENGTH(raw_phone) >= 8 
        THEN RIGHT(raw_phone, 11) 
        ELSE NULL 
      END AS norm_phone
    FROM filtered_leads
  ),
  -- Build unique buyer contacts from all transaction tables
  all_buyers AS (
    SELECT LOWER(TRIM(buyer_email)) AS b_email,
           CASE WHEN LENGTH(REGEXP_REPLACE(COALESCE(buyer_phone,''), '\D', '', 'g')) >= 8
             THEN RIGHT(REGEXP_REPLACE(COALESCE(buyer_phone,''), '\D', '', 'g'), 11)
             ELSE NULL END AS b_phone,
           computed_value AS revenue
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
    UNION ALL
    SELECT LOWER(TRIM(buyer_email)),
           CASE WHEN LENGTH(REGEXP_REPLACE(COALESCE(buyer_phone,''), '\D', '', 'g')) >= 8
             THEN RIGHT(REGEXP_REPLACE(COALESCE(buyer_phone,''), '\D', '', 'g'), 11)
             ELSE NULL END,
           sale_value
    FROM eduzz_transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
    UNION ALL
    SELECT LOWER(TRIM(buyer_email)),
           CASE WHEN LENGTH(REGEXP_REPLACE(COALESCE(buyer_phone,''), '\D', '', 'g')) >= 8
             THEN RIGHT(REGEXP_REPLACE(COALESCE(buyer_phone,''), '\D', '', 'g'), 11)
             ELSE NULL END,
           ticket_value
    FROM tmb_transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
  ),
  buyer_by_email AS (
    SELECT b_email, SUM(revenue) AS total_rev, COUNT(*) AS cnt
    FROM all_buyers
    WHERE b_email IS NOT NULL AND b_email != ''
    GROUP BY b_email
  ),
  buyer_by_phone AS (
    SELECT b_phone, SUM(revenue) AS total_rev, COUNT(*) AS cnt
    FROM all_buyers
    WHERE b_phone IS NOT NULL
    GROUP BY b_phone
  ),
  -- Unique leads with conversion status
  unique_leads AS (
    SELECT DISTINCT ON (COALESCE(NULLIF(norm_email,''), 'phone:' || COALESCE(norm_phone, id::text)))
      id,
      norm_email,
      norm_phone,
      page_url,
      utm_source,
      utm_medium,
      utm_campaign,
      COALESCE(NULLIF(norm_email,''), 'phone:' || COALESCE(norm_phone, id::text)) AS contact_key
    FROM leads_with_phone
    WHERE norm_email != '' OR norm_phone IS NOT NULL
  ),
  lead_conversions AS (
    SELECT 
      ul.*,
      CASE 
        WHEN ul.norm_email != '' AND EXISTS (SELECT 1 FROM buyer_by_email be WHERE be.b_email = ul.norm_email) THEN true
        WHEN ul.norm_phone IS NOT NULL AND EXISTS (SELECT 1 FROM buyer_by_phone bp WHERE bp.b_phone = ul.norm_phone) THEN true
        ELSE false
      END AS is_converted,
      COALESCE(
        (SELECT be.total_rev FROM buyer_by_email be WHERE be.b_email = ul.norm_email LIMIT 1),
        (SELECT bp.total_rev FROM buyer_by_phone bp WHERE bp.b_phone = ul.norm_phone LIMIT 1),
        0
      ) AS revenue
    FROM unique_leads ul
  ),
  summary AS (
    SELECT
      COUNT(*) AS total_leads,
      COUNT(*) FILTER (WHERE utm_source IS NOT NULL AND utm_medium IS NOT NULL AND utm_campaign IS NOT NULL) AS qualified_leads,
      COUNT(*) FILTER (WHERE is_converted) AS converted_leads,
      COALESCE(SUM(revenue) FILTER (WHERE is_converted), 0) AS total_revenue
    FROM lead_conversions
  ),
  -- Per-page stats
  page_conversions AS (
    SELECT
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(page_url, '\\?.*$', ''), '/$', '')) AS normalized_url,
      COUNT(*) AS total_leads,
      COUNT(*) FILTER (WHERE is_converted) AS converted_leads,
      COALESCE(SUM(revenue) FILTER (WHERE is_converted), 0) AS total_revenue
    FROM lead_conversions
    WHERE page_url IS NOT NULL AND page_url != ''
    GROUP BY 1
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) FILTER (WHERE is_converted) DESC, COUNT(*) DESC
    LIMIT 30
  )
  SELECT jsonb_build_object(
    'totalLeads', s.total_leads,
    'qualifiedLeads', s.qualified_leads,
    'convertedLeads', s.converted_leads,
    'totalRevenue', s.total_revenue,
    'conversionRate', CASE WHEN s.total_leads > 0 THEN ROUND((s.converted_leads::numeric / s.total_leads * 100), 2) ELSE 0 END,
    'qualificationRate', CASE WHEN s.total_leads > 0 THEN ROUND((s.qualified_leads::numeric / s.total_leads * 100), 2) ELSE 0 END,
    'qualifiedConversionRate', CASE WHEN s.qualified_leads > 0 THEN ROUND((s.converted_leads::numeric / s.qualified_leads * 100), 2) ELSE 0 END,
    'averageTicket', CASE WHEN s.converted_leads > 0 THEN ROUND((s.total_revenue / s.converted_leads), 2) ELSE 0 END,
    'pageConversions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'normalizedUrl', pc.normalized_url,
        'displayName', pc.normalized_url,
        'totalLeads', pc.total_leads,
        'convertedLeads', pc.converted_leads,
        'conversionRate', CASE WHEN pc.total_leads > 0 THEN ROUND((pc.converted_leads::numeric / pc.total_leads * 100), 2) ELSE 0 END,
        'totalRevenue', pc.total_revenue,
        'averageTicket', CASE WHEN pc.converted_leads > 0 THEN ROUND((pc.total_revenue / pc.converted_leads), 2) ELSE 0 END
      ))
      FROM page_conversions pc
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM summary s;

  RETURN COALESCE(v_result, '{"totalLeads":0,"qualifiedLeads":0,"convertedLeads":0,"totalRevenue":0,"conversionRate":0,"qualificationRate":0,"qualifiedConversionRate":0,"averageTicket":0,"pageConversions":[]}'::jsonb);
END;
$$;
