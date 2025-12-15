-- Update get_filter_options_with_counts to include products
CREATE OR REPLACE FUNCTION public.get_filter_options_with_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'billing_types', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', billing_type, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT billing_type, COUNT(*) as cnt
        FROM transactions
        WHERE user_id = auth.uid() AND billing_type IS NOT NULL
        GROUP BY billing_type
      ) sub
    ),
    'payment_methods', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', payment_method, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT payment_method, COUNT(*) as cnt
        FROM transactions
        WHERE user_id = auth.uid() AND payment_method IS NOT NULL
        GROUP BY payment_method
      ) sub
    ),
    'sck_codes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', sck_code, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT sck_code, COUNT(*) as cnt
        FROM transactions
        WHERE user_id = auth.uid() AND sck_code IS NOT NULL
        GROUP BY sck_code
      ) sub
    ),
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', product, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT product, COUNT(*) as cnt
        FROM transactions
        WHERE user_id = auth.uid() AND product IS NOT NULL
        GROUP BY product
      ) sub
    )
  );
END;
$function$;

-- Update get_transaction_stats to include p_product parameter
CREATE OR REPLACE FUNCTION public.get_transaction_stats(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_billing_type text DEFAULT NULL::text, 
  p_payment_method text DEFAULT NULL::text, 
  p_sck_code text DEFAULT NULL::text,
  p_product text DEFAULT NULL::text
)
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
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
    
    UNION ALL
    
    -- Recuperador Inteligente: group by buyer_email + product only (ONE purchase per product)
    SELECT 
      MIN(computed_value) as computed_value,
      MAX(currency) as currency,
      MAX(country) as country,
      MIN(purchase_date) as purchase_date
    FROM transactions
    WHERE user_id = auth.uid()
      AND billing_type ILIKE '%recuperador%'
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
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

-- Update get_top_customers to include p_product parameter
CREATE OR REPLACE FUNCTION public.get_top_customers(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_limit integer DEFAULT 10, 
  p_billing_type text DEFAULT NULL::text, 
  p_payment_method text DEFAULT NULL::text, 
  p_sck_code text DEFAULT NULL::text,
  p_product text DEFAULT NULL::text
)
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
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
    
    UNION ALL
    
    -- Recuperador Inteligente: group by buyer_email + product only (ONE purchase per product)
    SELECT 
      buyer_email,
      MAX(buyer_name) as buyer_name,
      MIN(computed_value) as computed_value,
      MAX(currency) as currency
    FROM transactions
    WHERE user_id = auth.uid()
      AND buyer_email IS NOT NULL
      AND billing_type ILIKE '%recuperador%'
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
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

-- Update get_sales_by_date to include p_product parameter
CREATE OR REPLACE FUNCTION public.get_sales_by_date(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_billing_type text DEFAULT NULL::text, 
  p_payment_method text DEFAULT NULL::text, 
  p_sck_code text DEFAULT NULL::text,
  p_product text DEFAULT NULL::text
)
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
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
    
    UNION ALL
    
    -- Recuperador Inteligente: group by buyer_email + product only (ONE purchase per product)
    SELECT 
      MIN(computed_value) as computed_value,
      MAX(currency) as currency,
      MIN(purchase_date) as purchase_date
    FROM transactions
    WHERE user_id = auth.uid()
      AND purchase_date IS NOT NULL
      AND billing_type ILIKE '%recuperador%'
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
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

-- Add product column to filter_views table
ALTER TABLE public.filter_views ADD COLUMN IF NOT EXISTS product text;