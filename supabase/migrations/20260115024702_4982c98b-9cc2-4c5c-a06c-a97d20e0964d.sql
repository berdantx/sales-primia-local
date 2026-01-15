-- Create eduzz_transactions table
CREATE TABLE public.eduzz_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  import_id UUID REFERENCES public.imports(id),
  
  -- Identificadores Eduzz
  sale_id TEXT NOT NULL,
  invoice_code TEXT,
  
  -- Dados do produto
  product TEXT,
  product_id TEXT,
  
  -- Dados do comprador
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  
  -- Valores
  sale_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  
  -- Datas
  sale_date TIMESTAMP WITH TIME ZONE,
  
  -- UTMs
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  
  -- Metadados
  source TEXT DEFAULT 'eduzz',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT eduzz_transactions_user_sale_unique UNIQUE (user_id, sale_id)
);

-- Create indexes for performance
CREATE INDEX idx_eduzz_transactions_client_id ON public.eduzz_transactions(client_id);
CREATE INDEX idx_eduzz_transactions_user_id ON public.eduzz_transactions(user_id);
CREATE INDEX idx_eduzz_transactions_sale_date ON public.eduzz_transactions(sale_date);
CREATE INDEX idx_eduzz_transactions_buyer_email ON public.eduzz_transactions(buyer_email);

-- Enable Row Level Security
ALTER TABLE public.eduzz_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view eduzz transactions for their clients"
ON public.eduzz_transactions
FOR SELECT
USING (user_has_client_access(client_id));

CREATE POLICY "Users can insert eduzz transactions for their clients"
ON public.eduzz_transactions
FOR INSERT
WITH CHECK (user_has_client_access(client_id));

CREATE POLICY "Users can update eduzz transactions for their clients"
ON public.eduzz_transactions
FOR UPDATE
USING (user_has_client_access(client_id));

CREATE POLICY "Users can delete eduzz transactions for their clients"
ON public.eduzz_transactions
FOR DELETE
USING (user_has_client_access(client_id));

-- Function: get_eduzz_transaction_stats
CREATE OR REPLACE FUNCTION public.get_eduzz_transaction_stats(
  p_client_id UUID DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL
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
    'totalByCurrency', COALESCE((
      SELECT json_object_agg(currency, total)
      FROM (
        SELECT 
          COALESCE(currency, 'BRL') as currency,
          SUM(sale_value) as total
        FROM eduzz_transactions t
        WHERE user_has_client_access(t.client_id)
          AND (p_client_id IS NULL OR t.client_id = p_client_id)
          AND (p_start_date IS NULL OR t.sale_date >= p_start_date::timestamptz)
          AND (p_end_date IS NULL OR t.sale_date <= p_end_date::timestamptz)
        GROUP BY COALESCE(currency, 'BRL')
      ) sub
    ), '{}'::json),
    'totalTransactions', (
      SELECT COUNT(*)
      FROM eduzz_transactions t
      WHERE user_has_client_access(t.client_id)
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
        AND (p_start_date IS NULL OR t.sale_date >= p_start_date::timestamptz)
        AND (p_end_date IS NULL OR t.sale_date <= p_end_date::timestamptz)
    ),
    'transactionsWithoutDate', (
      SELECT COUNT(*)
      FROM eduzz_transactions t
      WHERE user_has_client_access(t.client_id)
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
        AND t.sale_date IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: get_eduzz_top_customers
CREATE OR REPLACE FUNCTION public.get_eduzz_top_customers(
  p_client_id UUID DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
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
  SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json)
  FROM (
    SELECT 
      buyer_email as email,
      MAX(buyer_name) as name,
      SUM(sale_value) as total_value,
      COUNT(*) as total_purchases
    FROM eduzz_transactions t
    WHERE user_has_client_access(t.client_id)
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

-- Function: get_eduzz_sales_by_date
CREATE OR REPLACE FUNCTION public.get_eduzz_sales_by_date(
  p_client_id UUID DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_object_agg(date_key, data), '{}'::json)
  FROM (
    SELECT 
      TO_CHAR(sale_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as date_key,
      json_build_object(
        'BRL', SUM(CASE WHEN COALESCE(currency, 'BRL') = 'BRL' THEN sale_value ELSE 0 END),
        'USD', SUM(CASE WHEN currency = 'USD' THEN sale_value ELSE 0 END)
      ) as data
    FROM eduzz_transactions t
    WHERE user_has_client_access(t.client_id)
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

-- Function: get_eduzz_filter_options
CREATE OR REPLACE FUNCTION public.get_eduzz_filter_options(
  p_client_id UUID DEFAULT NULL
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
    'products', COALESCE((
      SELECT json_agg(DISTINCT product ORDER BY product)
      FROM eduzz_transactions t
      WHERE user_has_client_access(t.client_id)
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
        AND product IS NOT NULL
    ), '[]'::json),
    'sources', COALESCE((
      SELECT json_agg(DISTINCT utm_source ORDER BY utm_source)
      FROM eduzz_transactions t
      WHERE user_has_client_access(t.client_id)
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
        AND utm_source IS NOT NULL
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$;