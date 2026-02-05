-- Otimização de Performance: Verificação de permissões uma única vez
-- Este script otimiza as funções RPC que estavam causando timeout
-- ao chamar user_has_client_access() para cada linha (~53.000 vezes)

-- 1. Otimizar get_top_ads
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
AS $$
DECLARE
  result json;
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  -- Verificar permissões UMA VEZ no início
  v_is_master := public.has_role(auth.uid(), 'master');
  
  -- Se não for master, buscar lista de clientes permitidos
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  -- Verificação específica do cliente solicitado
  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN json_build_object('items', '[]'::json, 'totalCount', 0);
    END IF;
  END IF;

  WITH filtered_leads AS (
    SELECT * FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (v_is_master OR client_id = ANY(v_allowed_clients))
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
$$;

-- 2. Otimizar get_lead_stats
CREATE OR REPLACE FUNCTION public.get_lead_stats(
  p_client_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  -- Verificar permissões UMA VEZ no início
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  -- Verificação do cliente específico
  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN json_build_object(
        'total', 0,
        'by_source', '{}',
        'by_traffic_type', '{}',
        'by_utm_source', '{}',
        'by_utm_medium', '{}',
        'by_utm_campaign', '{}',
        'by_utm_content', '{}',
        'by_utm_term', '{}',
        'by_country', '{}',
        'by_city', '{}',
        'by_page', '{}',
        'by_day', '{}'
      );
    END IF;
  END IF;

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
      (created_at AT TIME ZONE 'America/Sao_Paulo')::date as lead_date
    FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (v_is_master OR client_id = ANY(v_allowed_clients))
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
$$;

-- 3. Otimizar get_eduzz_filter_options
CREATE OR REPLACE FUNCTION public.get_eduzz_filter_options(p_client_id uuid DEFAULT NULL::uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN json_build_object(
        'products', '[]'::json,
        'utm_sources', '[]'::json,
        'utm_mediums', '[]'::json,
        'utm_campaigns', '[]'::json,
        'utm_contents', '[]'::json
      );
    END IF;
  END IF;

  SELECT json_build_object(
    'products', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT product AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE (v_is_master OR e.client_id = ANY(v_allowed_clients))
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND product IS NOT NULL AND product != ''
        GROUP BY product
        ORDER BY count DESC
      ) t
    ),
    'utm_sources', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_source AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE (v_is_master OR e.client_id = ANY(v_allowed_clients))
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_source IS NOT NULL AND utm_source != ''
        GROUP BY utm_source
        ORDER BY count DESC
      ) t
    ),
    'utm_mediums', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_medium AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE (v_is_master OR e.client_id = ANY(v_allowed_clients))
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_medium IS NOT NULL AND utm_medium != ''
        GROUP BY utm_medium
        ORDER BY count DESC
      ) t
    ),
    'utm_campaigns', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_campaign AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE (v_is_master OR e.client_id = ANY(v_allowed_clients))
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_campaign IS NOT NULL AND utm_campaign != ''
        GROUP BY utm_campaign
        ORDER BY count DESC
      ) t
    ),
    'utm_contents', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_content AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE (v_is_master OR e.client_id = ANY(v_allowed_clients))
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_content IS NOT NULL AND utm_content != ''
        GROUP BY utm_content
        ORDER BY count DESC
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 4. Otimizar get_eduzz_transaction_stats
CREATE OR REPLACE FUNCTION public.get_eduzz_transaction_stats(
  p_client_id uuid DEFAULT NULL::uuid,
  p_start_date text DEFAULT NULL::text,
  p_end_date text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN json_build_object(
        'totalByCurrency', '{}'::json,
        'totalTransactions', 0,
        'transactionsWithoutDate', 0
      );
    END IF;
  END IF;

  SELECT json_build_object(
    'totalByCurrency', COALESCE((
      SELECT json_object_agg(currency, total)
      FROM (
        SELECT 
          COALESCE(currency, 'BRL') as currency,
          SUM(sale_value) as total
        FROM eduzz_transactions t
        WHERE (v_is_master OR t.client_id = ANY(v_allowed_clients))
          AND (p_client_id IS NULL OR t.client_id = p_client_id)
          AND (p_start_date IS NULL OR t.sale_date >= p_start_date::timestamptz)
          AND (p_end_date IS NULL OR t.sale_date <= p_end_date::timestamptz)
        GROUP BY COALESCE(currency, 'BRL')
      ) sub
    ), '{}'::json),
    'totalTransactions', (
      SELECT COUNT(*)
      FROM eduzz_transactions t
      WHERE (v_is_master OR t.client_id = ANY(v_allowed_clients))
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
        AND (p_start_date IS NULL OR t.sale_date >= p_start_date::timestamptz)
        AND (p_end_date IS NULL OR t.sale_date <= p_end_date::timestamptz)
    ),
    'transactionsWithoutDate', (
      SELECT COUNT(*)
      FROM eduzz_transactions t
      WHERE (v_is_master OR t.client_id = ANY(v_allowed_clients))
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
        AND t.sale_date IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 5. Otimizar get_eduzz_top_customers
CREATE OR REPLACE FUNCTION public.get_eduzz_top_customers(
  p_client_id uuid DEFAULT NULL::uuid,
  p_start_date text DEFAULT NULL::text,
  p_end_date text DEFAULT NULL::text,
  p_limit integer DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN '[]'::json;
    END IF;
  END IF;

  SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json)
  FROM (
    SELECT 
      buyer_email as email,
      MAX(buyer_name) as name,
      SUM(sale_value) as total_value,
      COUNT(*) as total_purchases
    FROM eduzz_transactions t
    WHERE (v_is_master OR t.client_id = ANY(v_allowed_clients))
      AND (p_client_id IS NULL OR t.client_id = p_client_id)
      AND (p_start_date IS NULL OR t.sale_date >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR t.sale_date <= p_end_date::timestamptz)
      AND buyer_email IS NOT NULL
    GROUP BY buyer_email
    ORDER BY total_value DESC
    LIMIT p_limit
  ) sub INTO result;
  
  RETURN result;
END;
$$;

-- 6. Otimizar get_eduzz_sales_by_date
CREATE OR REPLACE FUNCTION public.get_eduzz_sales_by_date(
  p_client_id uuid DEFAULT NULL::uuid,
  p_start_date text DEFAULT NULL::text,
  p_end_date text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN '{}'::json;
    END IF;
  END IF;

  SELECT COALESCE(json_object_agg(date_key, data), '{}'::json)
  FROM (
    SELECT 
      TO_CHAR(sale_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as date_key,
      json_build_object(
        'BRL', SUM(CASE WHEN COALESCE(currency, 'BRL') = 'BRL' THEN sale_value ELSE 0 END),
        'USD', SUM(CASE WHEN currency = 'USD' THEN sale_value ELSE 0 END)
      ) as data
    FROM eduzz_transactions t
    WHERE (v_is_master OR t.client_id = ANY(v_allowed_clients))
      AND (p_client_id IS NULL OR t.client_id = p_client_id)
      AND (p_start_date IS NULL OR t.sale_date >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR t.sale_date <= p_end_date::timestamptz)
      AND sale_date IS NOT NULL
    GROUP BY TO_CHAR(sale_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
    ORDER BY date_key
  ) sub INTO result;
  
  RETURN result;
END;
$$;

-- 7. Otimizar get_tmb_filter_options
CREATE OR REPLACE FUNCTION public.get_tmb_filter_options(p_client_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN jsonb_build_object(
        'products', '[]'::jsonb,
        'utm_sources', '[]'::jsonb,
        'utm_mediums', '[]'::jsonb,
        'utm_campaigns', '[]'::jsonb
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', product, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT product, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (v_is_master OR client_id = ANY(v_allowed_clients))
          AND product IS NOT NULL
        GROUP BY product
      ) sub
    ),
    'utm_sources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_source, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_source, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (v_is_master OR client_id = ANY(v_allowed_clients))
          AND utm_source IS NOT NULL
        GROUP BY utm_source
      ) sub
    ),
    'utm_mediums', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_medium, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_medium, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (v_is_master OR client_id = ANY(v_allowed_clients))
          AND utm_medium IS NOT NULL
        GROUP BY utm_medium
      ) sub
    ),
    'utm_campaigns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_campaign, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_campaign, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (v_is_master OR client_id = ANY(v_allowed_clients))
          AND utm_campaign IS NOT NULL
        GROUP BY utm_campaign
      ) sub
    )
  );
END;
$$;

-- 8. Otimizar get_tmb_transaction_stats
CREATE OR REPLACE FUNCTION public.get_tmb_transaction_stats(
  p_client_id uuid DEFAULT NULL::uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  v_is_master := public.has_role(auth.uid(), 'master');
  
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND (v_allowed_clients IS NULL OR NOT (p_client_id = ANY(v_allowed_clients))) THEN
      RETURN json_build_object(
        'total_brl', 0,
        'total_transactions', 0,
        'transactions_without_date', 0
      );
    END IF;
  END IF;

  SELECT json_build_object(
    'total_brl', COALESCE(SUM(ticket_value), 0),
    'total_transactions', COUNT(*),
    'transactions_without_date', (
      SELECT COUNT(*)
      FROM tmb_transactions
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND (v_is_master OR client_id = ANY(v_allowed_clients))
        AND effective_date IS NULL
    )
  )
  FROM tmb_transactions
  WHERE (p_client_id IS NULL OR client_id = p_client_id)
    AND (v_is_master OR client_id = ANY(v_allowed_clients))
    AND (p_start_date IS NULL OR effective_date >= p_start_date)
    AND (p_end_date IS NULL OR effective_date <= p_end_date)
  INTO result;
  
  RETURN result;
END;
$$;