-- Drop and recreate get_transaction_stats to return stats by country AND currency
CREATE OR REPLACE FUNCTION public.get_transaction_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_by_currency', (
      SELECT json_object_agg(currency, total)
      FROM (
        SELECT currency, SUM(computed_value) as total
        FROM transactions
        WHERE user_id = auth.uid()
          AND (p_start_date IS NULL OR purchase_date >= p_start_date)
          AND (p_end_date IS NULL OR purchase_date <= p_end_date)
        GROUP BY currency
      ) currency_totals
    ),
    'total_by_country', (
      SELECT json_object_agg(COALESCE(country, 'Desconhecido'), total)
      FROM (
        SELECT country, SUM(computed_value) as total
        FROM transactions
        WHERE user_id = auth.uid()
          AND (p_start_date IS NULL OR purchase_date >= p_start_date)
          AND (p_end_date IS NULL OR purchase_date <= p_end_date)
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
        FROM transactions
        WHERE user_id = auth.uid()
          AND (p_start_date IS NULL OR purchase_date >= p_start_date)
          AND (p_end_date IS NULL OR purchase_date <= p_end_date)
        GROUP BY country, currency
      ) country_currency_totals
    ),
    'total_transactions', (
      SELECT COUNT(*)
      FROM transactions
      WHERE user_id = auth.uid()
        AND (p_start_date IS NULL OR purchase_date >= p_start_date)
        AND (p_end_date IS NULL OR purchase_date <= p_end_date)
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
$$;