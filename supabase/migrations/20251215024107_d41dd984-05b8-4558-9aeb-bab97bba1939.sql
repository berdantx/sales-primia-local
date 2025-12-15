-- RPC Function: Get TMB Transaction Stats
CREATE OR REPLACE FUNCTION public.get_tmb_transaction_stats(
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
      WHERE user_id = auth.uid()
        AND effective_date IS NULL
    )
  )
  FROM tmb_transactions
  WHERE user_id = auth.uid()
    AND (p_start_date IS NULL OR effective_date >= p_start_date)
    AND (p_end_date IS NULL OR effective_date <= p_end_date)
  INTO result;
  
  RETURN result;
END;
$$;

-- RPC Function: Get TMB Sales by Date
CREATE OR REPLACE FUNCTION public.get_tmb_sales_by_date(
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
  SELECT json_object_agg(date, currencies)
  FROM (
    SELECT 
      TO_CHAR(effective_date, 'YYYY-MM-DD') as date,
      json_build_object('BRL', SUM(ticket_value)) as currencies
    FROM tmb_transactions
    WHERE user_id = auth.uid()
      AND effective_date IS NOT NULL
      AND (p_start_date IS NULL OR effective_date >= p_start_date)
      AND (p_end_date IS NULL OR effective_date <= p_end_date)
    GROUP BY TO_CHAR(effective_date, 'YYYY-MM-DD')
  ) date_data INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- RPC Function: Get TMB Top Customers
CREATE OR REPLACE FUNCTION public.get_tmb_top_customers(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 10
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
      COALESCE(MAX(buyer_name), buyer_email) as name,
      SUM(ticket_value) as "totalValue",
      COUNT(*) as "totalPurchases",
      'BRL' as currency
    FROM tmb_transactions
    WHERE user_id = auth.uid()
      AND buyer_email IS NOT NULL
      AND (p_start_date IS NULL OR effective_date >= p_start_date)
      AND (p_end_date IS NULL OR effective_date <= p_end_date)
    GROUP BY buyer_email
    ORDER BY SUM(ticket_value) DESC
    LIMIT p_limit
  ) customer_data INTO result;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;