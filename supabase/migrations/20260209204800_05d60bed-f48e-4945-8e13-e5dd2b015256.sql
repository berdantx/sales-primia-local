
-- 1) Drop ALL overloaded versions of the problematic functions
DROP FUNCTION IF EXISTS public.get_landing_page_stats(uuid, timestamptz, timestamptz, integer, integer);
DROP FUNCTION IF EXISTS public.get_landing_page_stats(text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_funnel_evolution(uuid, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_funnel_evolution(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_conversion_summary(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_conversion_summary(text, text, text);

-- 2) Create indexes to speed up the queries
CREATE INDEX IF NOT EXISTS idx_leads_client_created ON public.leads(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_email_lower ON public.transactions(lower(buyer_email)) WHERE buyer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_phone ON public.transactions(buyer_phone) WHERE buyer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eduzz_transactions_buyer_email_lower ON public.eduzz_transactions(lower(buyer_email)) WHERE buyer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eduzz_transactions_buyer_phone ON public.eduzz_transactions(buyer_phone) WHERE buyer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tmb_transactions_buyer_email_lower ON public.tmb_transactions(lower(buyer_email)) WHERE buyer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tmb_transactions_buyer_phone ON public.tmb_transactions(buyer_phone) WHERE buyer_phone IS NOT NULL;

-- 3) Recreate get_landing_page_stats (text params, simple query)
CREATE OR REPLACE FUNCTION public.get_landing_page_stats(
  p_client_id text,
  p_start_date text,
  p_end_date text,
  p_min_leads integer DEFAULT 5,
  p_limit integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '15s'
AS $$
DECLARE
  v_client_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_result json;
BEGIN
  v_client_id := p_client_id::uuid;
  v_start := CASE WHEN p_start_date IS NOT NULL THEN p_start_date::timestamptz ELSE NULL END;
  v_end := CASE WHEN p_end_date IS NOT NULL THEN p_end_date::timestamptz ELSE NULL END;

  SELECT json_build_object(
    'stats', COALESCE(stats_arr, '[]'::json),
    'totalPages', COALESCE(total_ct, 0),
    'hiddenPages', COALESCE(hidden_ct, 0)
  ) INTO v_result
  FROM (
    SELECT
      (SELECT json_agg(row_to_json(t)) FROM (
        SELECT
          COALESCE(
            regexp_replace(regexp_replace(lower(page_url), 'https?://', ''), '/+$', ''),
            'direto'
          ) AS "normalizedUrl",
          COALESCE(
            regexp_replace(regexp_replace(lower(page_url), 'https?://', ''), '/+$', ''),
            'Acesso Direto'
          ) AS "displayName",
          count(*) AS "leadCount",
          min(created_at)::text AS "firstLeadDate",
          max(created_at)::text AS "lastLeadDate"
        FROM public.leads
        WHERE client_id = v_client_id
          AND (v_start IS NULL OR created_at >= v_start)
          AND (v_end IS NULL OR created_at <= v_end)
        GROUP BY COALESCE(
          regexp_replace(regexp_replace(lower(page_url), 'https?://', ''), '/+$', ''),
          'direto'
        )
        HAVING count(*) >= p_min_leads
        ORDER BY count(*) DESC
        LIMIT p_limit
      ) t) AS stats_arr,
      (SELECT count(DISTINCT COALESCE(
        regexp_replace(regexp_replace(lower(page_url), 'https?://', ''), '/+$', ''),
        'direto'
      ))
      FROM public.leads
      WHERE client_id = v_client_id
        AND (v_start IS NULL OR created_at >= v_start)
        AND (v_end IS NULL OR created_at <= v_end)
      )::int AS total_ct,
      (SELECT count(DISTINCT COALESCE(
        regexp_replace(regexp_replace(lower(page_url), 'https?://', ''), '/+$', ''),
        'direto'
      ))
      FROM public.leads
      WHERE client_id = v_client_id
        AND (v_start IS NULL OR created_at >= v_start)
        AND (v_end IS NULL OR created_at <= v_end)
      HAVING count(*) < p_min_leads
      )::int AS hidden_ct
  ) sub;

  RETURN COALESCE(v_result, '{"stats":[],"totalPages":0,"hiddenPages":0}'::json);
END;
$$;

-- 4) Recreate get_funnel_evolution (optimized, no cross-platform join)
CREATE OR REPLACE FUNCTION public.get_funnel_evolution(
  p_client_id text,
  p_start_date text,
  p_end_date text,
  p_group_by text DEFAULT 'day'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '15s'
AS $$
DECLARE
  v_client_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_result json;
BEGIN
  v_client_id := p_client_id::uuid;
  v_start := CASE WHEN p_start_date IS NOT NULL THEN p_start_date::timestamptz ELSE NULL END;
  v_end := CASE WHEN p_end_date IS NOT NULL THEN p_end_date::timestamptz ELSE NULL END;

  -- Pre-compute converted contacts into a temp table for fast lookup
  CREATE TEMP TABLE IF NOT EXISTS _converted_contacts (contact text PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _converted_contacts;

  INSERT INTO _converted_contacts(contact)
  SELECT DISTINCT lower(buyer_email) FROM public.transactions
  WHERE client_id = v_client_id AND buyer_email IS NOT NULL
  UNION
  SELECT DISTINCT lower(buyer_email) FROM public.eduzz_transactions
  WHERE client_id = v_client_id AND buyer_email IS NOT NULL
  UNION
  SELECT DISTINCT lower(buyer_email) FROM public.tmb_transactions
  WHERE client_id = v_client_id AND buyer_email IS NOT NULL
  UNION
  SELECT DISTINCT buyer_phone FROM public.transactions
  WHERE client_id = v_client_id AND buyer_phone IS NOT NULL AND buyer_phone != ''
  UNION
  SELECT DISTINCT buyer_phone FROM public.eduzz_transactions
  WHERE client_id = v_client_id AND buyer_phone IS NOT NULL AND buyer_phone != ''
  UNION
  SELECT DISTINCT buyer_phone FROM public.tmb_transactions
  WHERE client_id = v_client_id AND buyer_phone IS NOT NULL AND buyer_phone != '';

  SELECT json_agg(row_to_json(r) ORDER BY r.date) INTO v_result
  FROM (
    SELECT
      CASE WHEN p_group_by = 'week'
        THEN to_char(date_trunc('week', l.created_at), 'YYYY-MM-DD')
        ELSE to_char(l.created_at::date, 'YYYY-MM-DD')
      END AS date,
      count(*) AS "totalLeads",
      count(*) FILTER (WHERE l.utm_source IS NOT NULL AND l.utm_medium IS NOT NULL AND l.utm_campaign IS NOT NULL) AS "qualifiedLeads",
      ROUND(
        count(*) FILTER (WHERE l.utm_source IS NOT NULL AND l.utm_medium IS NOT NULL AND l.utm_campaign IS NOT NULL) * 100.0 / NULLIF(count(*), 0),
        2
      ) AS "qualificationRate",
      count(*) FILTER (WHERE
        (l.email IS NOT NULL AND EXISTS (SELECT 1 FROM _converted_contacts cc WHERE cc.contact = lower(l.email)))
        OR (l.phone IS NOT NULL AND l.phone != '' AND EXISTS (SELECT 1 FROM _converted_contacts cc WHERE cc.contact = l.phone))
      ) AS "convertedLeads",
      ROUND(
        count(*) FILTER (WHERE
          (l.email IS NOT NULL AND EXISTS (SELECT 1 FROM _converted_contacts cc WHERE cc.contact = lower(l.email)))
          OR (l.phone IS NOT NULL AND l.phone != '' AND EXISTS (SELECT 1 FROM _converted_contacts cc WHERE cc.contact = l.phone))
        ) * 100.0 / NULLIF(count(*), 0),
        2
      ) AS "conversionRate",
      0 AS "qualifiedConversionRate"
    FROM public.leads l
    WHERE l.client_id = v_client_id
      AND (v_start IS NULL OR l.created_at >= v_start)
      AND (v_end IS NULL OR l.created_at <= v_end)
    GROUP BY
      CASE WHEN p_group_by = 'week'
        THEN to_char(date_trunc('week', l.created_at), 'YYYY-MM-DD')
        ELSE to_char(l.created_at::date, 'YYYY-MM-DD')
      END
  ) r;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 5) Recreate get_conversion_summary (optimized with temp table)
CREATE OR REPLACE FUNCTION public.get_conversion_summary(
  p_client_id text,
  p_start_date text,
  p_end_date text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '20s'
AS $$
DECLARE
  v_client_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_total_leads bigint;
  v_qualified bigint;
  v_converted bigint;
  v_total_revenue numeric;
  v_result json;
BEGIN
  v_client_id := p_client_id::uuid;
  v_start := CASE WHEN p_start_date IS NOT NULL THEN p_start_date::timestamptz ELSE NULL END;
  v_end := CASE WHEN p_end_date IS NOT NULL THEN p_end_date::timestamptz ELSE NULL END;

  -- Build a temp table of all buyer contacts with their revenue
  CREATE TEMP TABLE IF NOT EXISTS _buyers (contact text, revenue numeric) ON COMMIT DROP;
  TRUNCATE _buyers;

  INSERT INTO _buyers(contact, revenue)
  SELECT lower(buyer_email), SUM(computed_value) FROM public.transactions
  WHERE client_id = v_client_id AND buyer_email IS NOT NULL
  GROUP BY lower(buyer_email)
  UNION ALL
  SELECT buyer_phone, SUM(computed_value) FROM public.transactions
  WHERE client_id = v_client_id AND buyer_phone IS NOT NULL AND buyer_phone != ''
  GROUP BY buyer_phone
  UNION ALL
  SELECT lower(buyer_email), SUM(sale_value) FROM public.eduzz_transactions
  WHERE client_id = v_client_id AND buyer_email IS NOT NULL
  GROUP BY lower(buyer_email)
  UNION ALL
  SELECT buyer_phone, SUM(sale_value) FROM public.eduzz_transactions
  WHERE client_id = v_client_id AND buyer_phone IS NOT NULL AND buyer_phone != ''
  GROUP BY buyer_phone
  UNION ALL
  SELECT lower(buyer_email), SUM(ticket_value) FROM public.tmb_transactions
  WHERE client_id = v_client_id AND buyer_email IS NOT NULL
  GROUP BY lower(buyer_email)
  UNION ALL
  SELECT buyer_phone, SUM(ticket_value) FROM public.tmb_transactions
  WHERE client_id = v_client_id AND buyer_phone IS NOT NULL AND buyer_phone != ''
  GROUP BY buyer_phone;

  -- Create index on temp table
  CREATE INDEX IF NOT EXISTS _buyers_contact_idx ON _buyers(contact);

  -- Count leads
  SELECT count(*) INTO v_total_leads
  FROM public.leads
  WHERE client_id = v_client_id
    AND (v_start IS NULL OR created_at >= v_start)
    AND (v_end IS NULL OR created_at <= v_end);

  SELECT count(*) INTO v_qualified
  FROM public.leads
  WHERE client_id = v_client_id
    AND (v_start IS NULL OR created_at >= v_start)
    AND (v_end IS NULL OR created_at <= v_end)
    AND utm_source IS NOT NULL AND utm_medium IS NOT NULL AND utm_campaign IS NOT NULL;

  -- Count converted leads and their revenue
  SELECT count(*), COALESCE(SUM(buyer_rev), 0)
  INTO v_converted, v_total_revenue
  FROM (
    SELECT l.id,
      COALESCE(
        (SELECT MAX(b.revenue) FROM _buyers b WHERE b.contact = lower(l.email) AND l.email IS NOT NULL),
        (SELECT MAX(b.revenue) FROM _buyers b WHERE b.contact = l.phone AND l.phone IS NOT NULL AND l.phone != ''),
        0
      ) AS buyer_rev
    FROM public.leads l
    WHERE l.client_id = v_client_id
      AND (v_start IS NULL OR l.created_at >= v_start)
      AND (v_end IS NULL OR l.created_at <= v_end)
      AND (
        (l.email IS NOT NULL AND EXISTS (SELECT 1 FROM _buyers b WHERE b.contact = lower(l.email)))
        OR (l.phone IS NOT NULL AND l.phone != '' AND EXISTS (SELECT 1 FROM _buyers b WHERE b.contact = l.phone))
      )
  ) converted;

  SELECT json_build_object(
    'totalLeads', v_total_leads,
    'qualifiedLeads', v_qualified,
    'convertedLeads', v_converted,
    'totalRevenue', v_total_revenue,
    'conversionRate', CASE WHEN v_total_leads > 0 THEN ROUND(v_converted * 100.0 / v_total_leads, 2) ELSE 0 END,
    'qualificationRate', CASE WHEN v_total_leads > 0 THEN ROUND(v_qualified * 100.0 / v_total_leads, 2) ELSE 0 END,
    'qualifiedConversionRate', CASE WHEN v_qualified > 0 THEN ROUND(v_converted * 100.0 / v_qualified, 2) ELSE 0 END,
    'averageTicket', CASE WHEN v_converted > 0 THEN ROUND(v_total_revenue / v_converted, 2) ELSE 0 END,
    'pageConversions', COALESCE((
      SELECT json_agg(row_to_json(pc) ORDER BY pc."totalLeads" DESC)
      FROM (
        SELECT
          COALESCE(regexp_replace(regexp_replace(lower(l.page_url), 'https?://', ''), '/+$', ''), 'direto') AS "normalizedUrl",
          COALESCE(regexp_replace(regexp_replace(lower(l.page_url), 'https?://', ''), '/+$', ''), 'Acesso Direto') AS "displayName",
          count(*) AS "totalLeads",
          count(*) FILTER (WHERE
            (l.email IS NOT NULL AND EXISTS (SELECT 1 FROM _buyers b WHERE b.contact = lower(l.email)))
            OR (l.phone IS NOT NULL AND l.phone != '' AND EXISTS (SELECT 1 FROM _buyers b WHERE b.contact = l.phone))
          ) AS "convertedLeads",
          ROUND(
            count(*) FILTER (WHERE
              (l.email IS NOT NULL AND EXISTS (SELECT 1 FROM _buyers b WHERE b.contact = lower(l.email)))
              OR (l.phone IS NOT NULL AND l.phone != '' AND EXISTS (SELECT 1 FROM _buyers b WHERE b.contact = l.phone))
            ) * 100.0 / NULLIF(count(*), 0), 2
          ) AS "conversionRate",
          0 AS "totalRevenue",
          0 AS "averageTicket"
        FROM public.leads l
        WHERE l.client_id = v_client_id
          AND (v_start IS NULL OR l.created_at >= v_start)
          AND (v_end IS NULL OR l.created_at <= v_end)
        GROUP BY COALESCE(regexp_replace(regexp_replace(lower(l.page_url), 'https?://', ''), '/+$', ''), 'direto'),
                 COALESCE(regexp_replace(regexp_replace(lower(l.page_url), 'https?://', ''), '/+$', ''), 'Acesso Direto')
        HAVING count(*) >= 5
        LIMIT 10
      ) pc
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
