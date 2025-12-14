-- Function to get transaction statistics aggregated
CREATE OR REPLACE FUNCTION public.get_transaction_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
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

-- Function to get top customers
CREATE OR REPLACE FUNCTION public.get_top_customers(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(customer_data)
  FROM (
    SELECT 
      buyer_email as email,
      COALESCE(buyer_name, buyer_email) as name,
      SUM(computed_value) as "totalValue",
      COUNT(*) as "totalPurchases",
      (SELECT currency FROM transactions t2 
       WHERE t2.buyer_email = transactions.buyer_email 
       AND t2.user_id = auth.uid()
       ORDER BY computed_value DESC LIMIT 1) as currency
    FROM transactions
    WHERE user_id = auth.uid()
      AND buyer_email IS NOT NULL
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
    GROUP BY buyer_email, buyer_name
    ORDER BY SUM(computed_value) DESC
    LIMIT p_limit
  ) customer_data INTO result;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get sales by date
CREATE OR REPLACE FUNCTION public.get_sales_by_date(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
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
      FROM transactions
      WHERE user_id = auth.uid()
        AND purchase_date IS NOT NULL
        AND (p_start_date IS NULL OR purchase_date >= p_start_date)
        AND (p_end_date IS NULL OR purchase_date <= p_end_date)
      GROUP BY DATE(purchase_date), currency
    ) daily_totals
    GROUP BY TO_CHAR(purchase_date, 'YYYY-MM-DD')
  ) date_data INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Function to get data date range (for auto-detection)
CREATE OR REPLACE FUNCTION public.get_transaction_date_range()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'min_date', MIN(purchase_date),
    'max_date', MAX(purchase_date)
  )
  FROM transactions
  WHERE user_id = auth.uid()
    AND purchase_date IS NOT NULL
  INTO result;
  
  RETURN result;
END;
$$;