
-- 1. Create cispay_transactions table
CREATE TABLE public.cispay_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  import_id uuid REFERENCES public.imports(id),
  sale_id text NOT NULL,
  product text,
  product_code text,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  sale_value numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'BRL',
  sale_date timestamp with time zone,
  turma text,
  promotion text,
  unit text,
  enrollment_type text,
  status text NOT NULL DEFAULT 'approved',
  source text DEFAULT 'cispay',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(sale_id, client_id)
);

-- 2. Enable RLS
ALTER TABLE public.cispay_transactions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view cispay transactions for their clients"
  ON public.cispay_transactions FOR SELECT TO authenticated
  USING (user_has_client_access(client_id));

CREATE POLICY "Users can insert cispay transactions for their clients"
  ON public.cispay_transactions FOR INSERT TO authenticated
  WITH CHECK (user_has_client_access(client_id));

CREATE POLICY "Users can update cispay transactions for their clients"
  ON public.cispay_transactions FOR UPDATE TO authenticated
  USING (user_has_client_access(client_id));

CREATE POLICY "Users can delete cispay transactions for their clients"
  ON public.cispay_transactions FOR DELETE TO authenticated
  USING (user_has_client_access(client_id));

-- 4. RPC: get_cispay_transaction_stats
CREATE OR REPLACE FUNCTION public.get_cispay_transaction_stats(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalByCurrency', COALESCE((
      SELECT jsonb_object_agg(currency, total)
      FROM (
        SELECT COALESCE(currency, 'BRL') as currency, SUM(sale_value) as total
        FROM cispay_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id::uuid)
          AND (p_start_date IS NULL OR sale_date >= p_start_date::timestamptz)
          AND (p_end_date IS NULL OR sale_date <= p_end_date::timestamptz)
          AND status = 'approved'
        GROUP BY COALESCE(currency, 'BRL')
      ) sub
    ), '{}'::jsonb),
    'totalTransactions', (
      SELECT COUNT(*)::int
      FROM cispay_transactions
      WHERE (p_client_id IS NULL OR client_id = p_client_id::uuid)
        AND (p_start_date IS NULL OR sale_date >= p_start_date::timestamptz)
        AND (p_end_date IS NULL OR sale_date <= p_end_date::timestamptz)
    ),
    'transactionsWithoutDate', (
      SELECT COUNT(*)::int
      FROM cispay_transactions
      WHERE (p_client_id IS NULL OR client_id = p_client_id::uuid)
        AND sale_date IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 5. RPC: get_cispay_top_customers
CREATE OR REPLACE FUNCTION public.get_cispay_top_customers(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE(email text, name text, total_value numeric, total_purchases bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ct.buyer_email, 'unknown') as email,
    COALESCE(MAX(ct.buyer_name), 'Desconhecido') as name,
    SUM(ct.sale_value) as total_value,
    COUNT(*) as total_purchases
  FROM cispay_transactions ct
  WHERE (p_client_id IS NULL OR ct.client_id = p_client_id::uuid)
    AND (p_start_date IS NULL OR ct.sale_date >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR ct.sale_date <= p_end_date::timestamptz)
    AND ct.status = 'approved'
  GROUP BY ct.buyer_email
  ORDER BY total_value DESC
  LIMIT p_limit;
END;
$$;

-- 6. RPC: get_cispay_sales_by_date
CREATE OR REPLACE FUNCTION public.get_cispay_sales_by_date(
  p_client_id text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_object_agg(sale_day, currencies),
    '{}'::jsonb
  )
  FROM (
    SELECT
      TO_CHAR(sale_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as sale_day,
      jsonb_object_agg(COALESCE(currency, 'BRL'), day_total) as currencies
    FROM (
      SELECT
        sale_date,
        COALESCE(currency, 'BRL') as currency,
        SUM(sale_value) as day_total
      FROM cispay_transactions
      WHERE sale_date IS NOT NULL
        AND (p_client_id IS NULL OR client_id = p_client_id::uuid)
        AND (p_start_date IS NULL OR sale_date >= p_start_date::timestamptz)
        AND (p_end_date IS NULL OR sale_date <= p_end_date::timestamptz)
        AND status = 'approved'
      GROUP BY sale_date, COALESCE(currency, 'BRL')
    ) daily
    GROUP BY TO_CHAR(sale_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
  ) grouped
  INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 7. RPC: get_cispay_filter_options
CREATE OR REPLACE FUNCTION public.get_cispay_filter_options(
  p_client_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', product, 'count', cnt))
      FROM (
        SELECT product as product, COUNT(*) as cnt
        FROM cispay_transactions
        WHERE product IS NOT NULL AND product != ''
          AND (p_client_id IS NULL OR client_id = p_client_id::uuid)
        GROUP BY product
        ORDER BY cnt DESC
      ) sub
    ), '[]'::jsonb),
    'turmas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', turma, 'count', cnt))
      FROM (
        SELECT turma, COUNT(*) as cnt
        FROM cispay_transactions
        WHERE turma IS NOT NULL AND turma != ''
          AND (p_client_id IS NULL OR client_id = p_client_id::uuid)
        GROUP BY turma
        ORDER BY cnt DESC
      ) sub
    ), '[]'::jsonb),
    'units', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', unit, 'count', cnt))
      FROM (
        SELECT unit, COUNT(*) as cnt
        FROM cispay_transactions
        WHERE unit IS NOT NULL AND unit != ''
          AND (p_client_id IS NULL OR client_id = p_client_id::uuid)
        GROUP BY unit
        ORDER BY cnt DESC
      ) sub
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- 8. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cispay_transactions;
