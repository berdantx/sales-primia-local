-- Hotmart: versão com p_user_id para Edge Functions
CREATE OR REPLACE FUNCTION public.get_transaction_stats_by_user(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH deduplicated_transactions AS (
    -- Normal transactions (not Recuperador Inteligente)
    SELECT computed_value, currency, country, purchase_date
    FROM transactions
    WHERE user_id = p_user_id
      AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    
    UNION ALL
    
    -- Recuperador Inteligente: group by buyer_email + product only (ONE purchase per product)
    SELECT 
      MIN(computed_value) as computed_value,
      MAX(currency) as currency,
      MAX(country) as country,
      MIN(purchase_date) as purchase_date
    FROM transactions
    WHERE user_id = p_user_id
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
      WHERE user_id = p_user_id
        AND purchase_date IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- TMB: versão com p_user_id para Edge Functions
CREATE OR REPLACE FUNCTION public.get_tmb_transaction_stats_by_user(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_brl', COALESCE(SUM(ticket_value), 0),
    'total_transactions', COUNT(*),
    'transactions_without_date', (
      SELECT COUNT(*)
      FROM tmb_transactions
      WHERE user_id = p_user_id
        AND effective_date IS NULL
    )
  )
  FROM tmb_transactions
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR effective_date >= p_start_date)
    AND (p_end_date IS NULL OR effective_date <= p_end_date)
  INTO result;
  
  RETURN result;
END;
$$;