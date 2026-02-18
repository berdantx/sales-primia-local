
-- Update get_eduzz_transaction_stats to exclude canceled transactions
CREATE OR REPLACE FUNCTION public.get_eduzz_transaction_stats(p_client_id uuid DEFAULT NULL::uuid, p_start_date text DEFAULT NULL::text, p_end_date text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          AND t.status = 'paid'
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
        AND t.status = 'paid'
    ),
    'transactionsWithoutDate', (
      SELECT COUNT(*)
      FROM eduzz_transactions t
      WHERE (v_is_master OR t.client_id = ANY(v_allowed_clients))
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
        AND t.sale_date IS NULL
        AND t.status = 'paid'
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Update get_eduzz_top_customers to exclude canceled transactions
CREATE OR REPLACE FUNCTION public.get_eduzz_top_customers(p_client_id uuid DEFAULT NULL::uuid, p_start_date text DEFAULT NULL::text, p_end_date text DEFAULT NULL::text, p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND t.status = 'paid'
    GROUP BY buyer_email
    ORDER BY total_value DESC
    LIMIT p_limit
  ) sub INTO result;
  
  RETURN result;
END;
$function$;

-- Update get_eduzz_sales_by_date to exclude canceled transactions
CREATE OR REPLACE FUNCTION public.get_eduzz_sales_by_date(p_client_id uuid DEFAULT NULL::uuid, p_start_date text DEFAULT NULL::text, p_end_date text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND t.status = 'paid'
    GROUP BY TO_CHAR(sale_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
    ORDER BY date_key
  ) sub INTO result;
  
  RETURN result;
END;
$function$;
