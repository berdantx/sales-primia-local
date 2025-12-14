
-- Update get_transaction_stats to group "Recuperador Inteligente" by buyer/product
CREATE OR REPLACE FUNCTION public.get_transaction_stats(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  WITH deduplicated_transactions AS (
    -- Normal transactions (not Recuperador Inteligente)
    SELECT computed_value, currency, country, purchase_date
    FROM transactions
    WHERE user_id = auth.uid()
      AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    
    UNION ALL
    
    -- Recuperador Inteligente: group by buyer/product as single purchase
    SELECT 
      MAX(computed_value) as computed_value,
      MAX(currency) as currency,
      MAX(country) as country,
      MIN(purchase_date) as purchase_date
    FROM transactions
    WHERE user_id = auth.uid()
      AND billing_type ILIKE '%recuperador%'
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    GROUP BY buyer_email, product
  )
  SELECT json_build_object(
    'total_by_currency', (
      SELECT json_object_agg(currency, total)
      FROM (
        SELECT currency, SUM(computed_value) as total
        FROM deduplicated_transactions
        GROUP BY currency
      ) currency_totals
    ),
    'total_by_country', (
      SELECT json_object_agg(COALESCE(country, 'Desconhecido'), total)
      FROM (
        SELECT country, SUM(computed_value) as total
        FROM deduplicated_transactions
        GROUP BY country
      ) country_totals
    ),
    'total_by_country_currency', (
      SELECT json_object_agg(country_key, currency_data)
      FROM (
        SELECT 
          COALESCE(country, 'Desconhecido') as country_key,
          json_build_object(
            'currency', currency,
            'total', SUM(computed_value),
            'count', COUNT(*)
          ) as currency_data
        FROM deduplicated_transactions
        GROUP BY country, currency
      ) country_currency_totals
    ),
    'total_transactions', (
      SELECT COUNT(*) FROM deduplicated_transactions
    ),
    'transactions_without_date', (
      SELECT COUNT(*)
      FROM transactions
      WHERE user_id = auth.uid()
        AND purchase_date IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Update get_top_customers to group "Recuperador Inteligente" by buyer/product
CREATE OR REPLACE FUNCTION public.get_top_customers(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  WITH deduplicated_transactions AS (
    -- Normal transactions
    SELECT buyer_email, buyer_name, computed_value, currency
    FROM transactions
    WHERE user_id = auth.uid()
      AND buyer_email IS NOT NULL
      AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    
    UNION ALL
    
    -- Recuperador Inteligente: group by buyer/product as single purchase
    SELECT 
      buyer_email,
      MAX(buyer_name) as buyer_name,
      MAX(computed_value) as computed_value,
      MAX(currency) as currency
    FROM transactions
    WHERE user_id = auth.uid()
      AND buyer_email IS NOT NULL
      AND billing_type ILIKE '%recuperador%'
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    GROUP BY buyer_email, product
  )
  SELECT json_agg(customer_data)
  FROM (
    SELECT 
      buyer_email as email,
      COALESCE(MAX(buyer_name), buyer_email) as name,
      SUM(computed_value) as "totalValue",
      COUNT(*) as "totalPurchases",
      (SELECT currency FROM deduplicated_transactions t2 
       WHERE t2.buyer_email = deduplicated_transactions.buyer_email 
       ORDER BY computed_value DESC LIMIT 1) as currency
    FROM deduplicated_transactions
    GROUP BY buyer_email
    ORDER BY SUM(computed_value) DESC
    LIMIT p_limit
  ) customer_data INTO result;
  
  RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- Update get_sales_by_date to group "Recuperador Inteligente" by buyer/product
CREATE OR REPLACE FUNCTION public.get_sales_by_date(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  WITH deduplicated_transactions AS (
    -- Normal transactions
    SELECT computed_value, currency, purchase_date
    FROM transactions
    WHERE user_id = auth.uid()
      AND purchase_date IS NOT NULL
      AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    
    UNION ALL
    
    -- Recuperador Inteligente: group by buyer/product, use first installment date
    SELECT 
      MAX(computed_value) as computed_value,
      MAX(currency) as currency,
      MIN(purchase_date) as purchase_date
    FROM transactions
    WHERE user_id = auth.uid()
      AND purchase_date IS NOT NULL
      AND billing_type ILIKE '%recuperador%'
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    GROUP BY buyer_email, product
  )
  SELECT json_object_agg(date, currencies)
  FROM (
    SELECT 
      TO_CHAR(purchase_date, 'YYYY-MM-DD') as date,
      json_object_agg(currency, total) as currencies
    FROM (
      SELECT 
        DATE(purchase_date) as purchase_date,
        currency,
        SUM(computed_value) as total
      FROM deduplicated_transactions
      GROUP BY DATE(purchase_date), currency
    ) daily_totals
    GROUP BY TO_CHAR(purchase_date, 'YYYY-MM-DD')
  ) date_data INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$function$;
