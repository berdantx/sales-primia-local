-- Otimizar get_top_ads usando consultas diretas sem CTE para reduzir consumo de memória
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
  v_has_access boolean := false;
BEGIN
  -- Verificar se é master
  v_is_master := public.has_role(auth.uid(), 'master');
  
  -- Se não for master, verificar acesso específico ao cliente
  IF NOT v_is_master THEN
    IF p_client_id IS NULL THEN
      -- Sem cliente especificado e não é master: retornar vazio
      RETURN json_build_object('items', '[]'::json, 'totalCount', 0);
    END IF;
    
    -- Verificar se tem acesso ao cliente
    SELECT EXISTS(
      SELECT 1 FROM public.client_users 
      WHERE user_id = auth.uid() AND client_id = p_client_id
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      RETURN json_build_object('items', '[]'::json, 'totalCount', 0);
    END IF;
  END IF;

  -- Query otimizada sem CTE
  SELECT json_build_object(
    'items', COALESCE((
      SELECT json_agg(row_data ORDER BY count DESC)
      FROM (
        SELECT json_build_object(
          'name', name,
          'count', count,
          'percentage', ROUND((count::numeric / NULLIF(SUM(count) OVER(), 0)) * 100, 1),
          'firstLeadDate', first_lead_date,
          'isNew', first_lead_date > NOW() - INTERVAL '7 days'
        ) as row_data, count
        FROM (
          SELECT 
            CASE p_mode
              WHEN 'ads' THEN utm_content
              WHEN 'campaigns' THEN utm_campaign
              WHEN 'pages' THEN regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '')
              ELSE utm_content
            END as name,
            COUNT(*) as count,
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
          GROUP BY 
            CASE p_mode
              WHEN 'ads' THEN utm_content
              WHEN 'campaigns' THEN utm_campaign
              WHEN 'pages' THEN regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '')
              ELSE utm_content
            END
          ORDER BY count DESC
          LIMIT p_limit
        ) grouped
      ) with_percentage
    ), '[]'::json),
    'totalCount', (
      SELECT COUNT(DISTINCT 
        CASE p_mode
          WHEN 'ads' THEN utm_content
          WHEN 'campaigns' THEN utm_campaign
          WHEN 'pages' THEN regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '')
          ELSE utm_content
        END
      )
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
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Otimizar get_lead_stats também
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
  v_is_master boolean;
  v_has_access boolean := false;
BEGIN
  -- Verificar se é master
  v_is_master := public.has_role(auth.uid(), 'master');
  
  -- Se não for master, verificar acesso específico ao cliente
  IF NOT v_is_master THEN
    IF p_client_id IS NULL THEN
      RETURN json_build_object(
        'total', 0,
        'by_source', '{}'::json,
        'by_traffic_type', '{}'::json,
        'by_utm_source', '{}'::json,
        'by_utm_medium', '{}'::json,
        'by_utm_campaign', '{}'::json,
        'by_utm_content', '{}'::json,
        'by_utm_term', '{}'::json,
        'by_country', '{}'::json,
        'by_city', '{}'::json,
        'by_page', '{}'::json,
        'by_day', '{}'::json
      );
    END IF;
    
    SELECT EXISTS(
      SELECT 1 FROM public.client_users 
      WHERE user_id = auth.uid() AND client_id = p_client_id
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      RETURN json_build_object(
        'total', 0,
        'by_source', '{}'::json,
        'by_traffic_type', '{}'::json,
        'by_utm_source', '{}'::json,
        'by_utm_medium', '{}'::json,
        'by_utm_campaign', '{}'::json,
        'by_utm_content', '{}'::json,
        'by_utm_term', '{}'::json,
        'by_country', '{}'::json,
        'by_city', '{}'::json,
        'by_page', '{}'::json,
        'by_day', '{}'::json
      );
    END IF;
  END IF;

  SELECT json_build_object(
    'total', (
      SELECT COUNT(*) FROM leads
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    'by_source', COALESCE((
      SELECT json_object_agg(COALESCE(source, 'unknown'), cnt)
      FROM (
        SELECT source, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY source
      ) s
    ), '{}'::json),
    'by_traffic_type', COALESCE((
      SELECT json_object_agg(COALESCE(traffic_type, 'unknown'), cnt)
      FROM (
        SELECT traffic_type, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY traffic_type
      ) s
    ), '{}'::json),
    'by_utm_source', COALESCE((
      SELECT json_object_agg(COALESCE(utm_source, 'unknown'), cnt)
      FROM (
        SELECT utm_source, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_source
      ) s
    ), '{}'::json),
    'by_utm_medium', COALESCE((
      SELECT json_object_agg(COALESCE(utm_medium, 'unknown'), cnt)
      FROM (
        SELECT utm_medium, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_medium
      ) s
    ), '{}'::json),
    'by_utm_campaign', COALESCE((
      SELECT json_object_agg(COALESCE(utm_campaign, 'unknown'), cnt)
      FROM (
        SELECT utm_campaign, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_campaign
      ) s
    ), '{}'::json),
    'by_utm_content', COALESCE((
      SELECT json_object_agg(COALESCE(utm_content, 'unknown'), cnt)
      FROM (
        SELECT utm_content, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_content
      ) s
    ), '{}'::json),
    'by_utm_term', COALESCE((
      SELECT json_object_agg(COALESCE(utm_term, 'unknown'), cnt)
      FROM (
        SELECT utm_term, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY utm_term
      ) s
    ), '{}'::json),
    'by_country', COALESCE((
      SELECT json_object_agg(COALESCE(country, 'unknown'), cnt)
      FROM (
        SELECT country, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY country
      ) s
    ), '{}'::json),
    'by_city', COALESCE((
      SELECT json_object_agg(COALESCE(city, 'unknown'), cnt)
      FROM (
        SELECT city, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY city
        ORDER BY cnt DESC
        LIMIT 100
      ) s
    ), '{}'::json),
    'by_page', COALESCE((
      SELECT json_object_agg(page, cnt)
      FROM (
        SELECT regexp_replace(regexp_replace(page_url, '^https?://', ''), '\?.*$', '') as page, COUNT(*) as cnt 
        FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
          AND page_url IS NOT NULL
        GROUP BY page
        ORDER BY cnt DESC
        LIMIT 100
      ) s
    ), '{}'::json),
    'by_day', COALESCE((
      SELECT json_object_agg(day, cnt)
      FROM (
        SELECT DATE(created_at) as day, COUNT(*) as cnt FROM leads
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY DATE(created_at)
        ORDER BY day
      ) s
    ), '{}'::json)
  ) INTO result;

  RETURN result;
END;
$$;