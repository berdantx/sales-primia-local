
CREATE OR REPLACE FUNCTION public.get_top_ads_by_conversion(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_mode text DEFAULT 'ads',
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_result jsonb;
BEGIN
  -- Convert params
  v_client_id := CASE WHEN p_client_id IS NOT NULL AND p_client_id != '' THEN p_client_id::uuid ELSE NULL END;
  v_start_date := CASE WHEN p_start_date IS NOT NULL AND p_start_date != '' THEN p_start_date::timestamptz ELSE NULL END;
  v_end_date := CASE WHEN p_end_date IS NOT NULL AND p_end_date != '' THEN p_end_date::timestamptz ELSE NULL END;

  -- Verify access
  IF v_client_id IS NOT NULL AND NOT user_has_client_access(v_client_id) THEN
    RETURN '{"items":[]}'::jsonb;
  END IF;

  WITH lead_groups AS (
    SELECT
      CASE 
        WHEN p_mode = 'campaigns' THEN COALESCE(l.utm_campaign, 'Sem campanha')
        ELSE COALESCE(l.utm_content, 'Sem anúncio')
      END AS group_name,
      l.email,
      l.phone
    FROM leads l
    WHERE (v_client_id IS NULL OR l.client_id = v_client_id)
      AND (v_start_date IS NULL OR l.created_at >= v_start_date)
      AND (v_end_date IS NULL OR l.created_at <= v_end_date)
      AND (
        CASE 
          WHEN p_mode = 'campaigns' THEN l.utm_campaign IS NOT NULL AND l.utm_campaign != ''
          ELSE l.utm_content IS NOT NULL AND l.utm_content != ''
        END
      )
  ),
  unique_leads AS (
    SELECT DISTINCT group_name, LOWER(TRIM(email)) AS email, phone
    FROM lead_groups
    WHERE email IS NOT NULL AND email != ''
  ),
  lead_counts AS (
    SELECT group_name, COUNT(DISTINCT email) AS total_leads
    FROM unique_leads
    GROUP BY group_name
  ),
  buyer_emails AS (
    SELECT LOWER(TRIM(buyer_email)) AS email, SUM(computed_value) AS revenue
    FROM transactions
    WHERE (v_client_id IS NULL OR client_id = v_client_id)
      AND buyer_email IS NOT NULL AND buyer_email != ''
    GROUP BY LOWER(TRIM(buyer_email))
    
    UNION ALL
    
    SELECT LOWER(TRIM(buyer_email)) AS email, SUM(sale_value) AS revenue
    FROM eduzz_transactions
    WHERE (v_client_id IS NULL OR client_id = v_client_id)
      AND buyer_email IS NOT NULL AND buyer_email != ''
    GROUP BY LOWER(TRIM(buyer_email))
    
    UNION ALL
    
    SELECT LOWER(TRIM(buyer_email)) AS email, SUM(ticket_value) AS revenue
    FROM tmb_transactions
    WHERE (v_client_id IS NULL OR client_id = v_client_id)
      AND buyer_email IS NOT NULL AND buyer_email != ''
    GROUP BY LOWER(TRIM(buyer_email))
  ),
  all_buyers AS (
    SELECT email, SUM(revenue) AS total_revenue
    FROM buyer_emails
    GROUP BY email
  ),
  conversions AS (
    SELECT 
      ul.group_name,
      ul.email,
      ab.total_revenue
    FROM unique_leads ul
    INNER JOIN all_buyers ab ON ul.email = ab.email
  ),
  conversion_stats AS (
    SELECT 
      group_name,
      COUNT(DISTINCT email) AS converted_leads,
      SUM(total_revenue) AS total_revenue
    FROM conversions
    GROUP BY group_name
  ),
  ranked AS (
    SELECT
      lc.group_name,
      lc.total_leads,
      COALESCE(cs.converted_leads, 0) AS converted_leads,
      COALESCE(cs.total_revenue, 0) AS total_revenue,
      CASE WHEN lc.total_leads > 0 
        THEN ROUND((COALESCE(cs.converted_leads, 0)::numeric / lc.total_leads) * 100, 2)
        ELSE 0 
      END AS conversion_rate,
      CASE WHEN COALESCE(cs.converted_leads, 0) > 0
        THEN ROUND(COALESCE(cs.total_revenue, 0) / cs.converted_leads, 2)
        ELSE 0
      END AS avg_ticket
    FROM lead_counts lc
    LEFT JOIN conversion_stats cs ON lc.group_name = cs.group_name
    WHERE COALESCE(cs.converted_leads, 0) > 0
    ORDER BY COALESCE(cs.converted_leads, 0) DESC, COALESCE(cs.total_revenue, 0) DESC
    LIMIT p_limit
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', group_name,
        'totalLeads', total_leads,
        'convertedLeads', converted_leads,
        'conversionRate', conversion_rate,
        'totalRevenue', total_revenue,
        'avgTicket', avg_ticket
      )
    ), '[]'::jsonb)
  ) INTO v_result
  FROM ranked;

  RETURN v_result;
END;
$$;
