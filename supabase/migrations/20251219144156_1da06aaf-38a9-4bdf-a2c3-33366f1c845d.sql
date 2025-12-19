-- ============================================
-- FASE 1: Criar estrutura de tabelas
-- ============================================

-- Criar tabela de clientes
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de relacionamento usuário-cliente
CREATE TABLE public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  is_owner boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- ============================================
-- FASE 2: Adicionar client_id às tabelas existentes
-- ============================================

-- Adicionar client_id à tabela transactions
ALTER TABLE public.transactions ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela tmb_transactions
ALTER TABLE public.tmb_transactions ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela goals
ALTER TABLE public.goals ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela imports
ALTER TABLE public.imports ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela filter_views
ALTER TABLE public.filter_views ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela external_webhooks
ALTER TABLE public.external_webhooks ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela invitations
ALTER TABLE public.invitations ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela webhook_logs
ALTER TABLE public.webhook_logs ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Adicionar client_id à tabela webhook_dispatch_logs
ALTER TABLE public.webhook_dispatch_logs ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- ============================================
-- FASE 3: Criar função helper para verificar acesso ao cliente
-- ============================================

CREATE OR REPLACE FUNCTION public.user_has_client_access(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Master tem acesso a todos os clientes
    public.has_role(auth.uid(), 'master') 
    OR 
    -- Usuário está associado ao cliente
    EXISTS (
      SELECT 1 FROM public.client_users 
      WHERE client_id = _client_id AND user_id = auth.uid()
    )
$$;

-- Função para obter clientes que o usuário tem acesso
CREATE OR REPLACE FUNCTION public.get_user_clients()
RETURNS SETOF public.clients
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.* 
  FROM public.clients c
  WHERE c.is_active = true
    AND (
      public.has_role(auth.uid(), 'master')
      OR EXISTS (
        SELECT 1 FROM public.client_users cu 
        WHERE cu.client_id = c.id AND cu.user_id = auth.uid()
      )
    )
  ORDER BY c.name
$$;

-- ============================================
-- FASE 4: Habilitar RLS e criar políticas
-- ============================================

-- RLS para clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can do everything with clients"
ON public.clients
FOR ALL
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Users can view their clients"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users 
    WHERE client_id = clients.id AND user_id = auth.uid()
  )
);

-- RLS para client_users
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can do everything with client_users"
ON public.client_users
FOR ALL
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Users can view their own client associations"
ON public.client_users
FOR SELECT
USING (user_id = auth.uid());

-- ============================================
-- FASE 5: Atualizar políticas das tabelas existentes
-- ============================================

-- Atualizar RLS da tabela transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

CREATE POLICY "Users can view transactions of their clients"
ON public.transactions FOR SELECT
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can insert transactions for their clients"
ON public.transactions FOR INSERT
WITH CHECK (public.user_has_client_access(client_id));

CREATE POLICY "Users can update transactions of their clients"
ON public.transactions FOR UPDATE
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can delete transactions of their clients"
ON public.transactions FOR DELETE
USING (public.user_has_client_access(client_id));

-- Atualizar RLS da tabela tmb_transactions
DROP POLICY IF EXISTS "Users can view own tmb transactions" ON public.tmb_transactions;
DROP POLICY IF EXISTS "Users can insert own tmb transactions" ON public.tmb_transactions;
DROP POLICY IF EXISTS "Users can update own tmb transactions" ON public.tmb_transactions;
DROP POLICY IF EXISTS "Users can delete own tmb transactions" ON public.tmb_transactions;

CREATE POLICY "Users can view tmb transactions of their clients"
ON public.tmb_transactions FOR SELECT
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can insert tmb transactions for their clients"
ON public.tmb_transactions FOR INSERT
WITH CHECK (public.user_has_client_access(client_id));

CREATE POLICY "Users can update tmb transactions of their clients"
ON public.tmb_transactions FOR UPDATE
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can delete tmb transactions of their clients"
ON public.tmb_transactions FOR DELETE
USING (public.user_has_client_access(client_id));

-- Atualizar RLS da tabela goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

CREATE POLICY "Users can view goals of their clients"
ON public.goals FOR SELECT
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can insert goals for their clients"
ON public.goals FOR INSERT
WITH CHECK (public.user_has_client_access(client_id));

CREATE POLICY "Users can update goals of their clients"
ON public.goals FOR UPDATE
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can delete goals of their clients"
ON public.goals FOR DELETE
USING (public.user_has_client_access(client_id));

-- Atualizar RLS da tabela imports
DROP POLICY IF EXISTS "Users can view their own imports" ON public.imports;
DROP POLICY IF EXISTS "Users can insert their own imports" ON public.imports;
DROP POLICY IF EXISTS "Users can update their own imports" ON public.imports;
DROP POLICY IF EXISTS "Users can delete their own imports" ON public.imports;

CREATE POLICY "Users can view imports of their clients"
ON public.imports FOR SELECT
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can insert imports for their clients"
ON public.imports FOR INSERT
WITH CHECK (public.user_has_client_access(client_id));

CREATE POLICY "Users can update imports of their clients"
ON public.imports FOR UPDATE
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can delete imports of their clients"
ON public.imports FOR DELETE
USING (public.user_has_client_access(client_id));

-- Atualizar RLS da tabela filter_views
DROP POLICY IF EXISTS "Users can view own filter views" ON public.filter_views;
DROP POLICY IF EXISTS "Users can insert own filter views" ON public.filter_views;
DROP POLICY IF EXISTS "Users can update own filter views" ON public.filter_views;
DROP POLICY IF EXISTS "Users can delete own filter views" ON public.filter_views;

CREATE POLICY "Users can view filter views of their clients"
ON public.filter_views FOR SELECT
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can insert filter views for their clients"
ON public.filter_views FOR INSERT
WITH CHECK (public.user_has_client_access(client_id));

CREATE POLICY "Users can update filter views of their clients"
ON public.filter_views FOR UPDATE
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can delete filter views of their clients"
ON public.filter_views FOR DELETE
USING (public.user_has_client_access(client_id));

-- Atualizar RLS da tabela external_webhooks
DROP POLICY IF EXISTS "Users can view their own webhooks" ON public.external_webhooks;
DROP POLICY IF EXISTS "Users can insert their own webhooks" ON public.external_webhooks;
DROP POLICY IF EXISTS "Users can update their own webhooks" ON public.external_webhooks;
DROP POLICY IF EXISTS "Users can delete their own webhooks" ON public.external_webhooks;

CREATE POLICY "Users can view webhooks of their clients"
ON public.external_webhooks FOR SELECT
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can insert webhooks for their clients"
ON public.external_webhooks FOR INSERT
WITH CHECK (public.user_has_client_access(client_id));

CREATE POLICY "Users can update webhooks of their clients"
ON public.external_webhooks FOR UPDATE
USING (public.user_has_client_access(client_id));

CREATE POLICY "Users can delete webhooks of their clients"
ON public.external_webhooks FOR DELETE
USING (public.user_has_client_access(client_id));

-- Atualizar RLS da tabela invitations
DROP POLICY IF EXISTS "Masters can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Masters can insert invitations" ON public.invitations;
DROP POLICY IF EXISTS "Masters can update invitations" ON public.invitations;

CREATE POLICY "Masters can view all invitations"
ON public.invitations FOR SELECT
USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Masters can insert invitations"
ON public.invitations FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Masters can update invitations"
ON public.invitations FOR UPDATE
USING (public.has_role(auth.uid(), 'master'));

-- Trigger para updated_at em clients
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FASE 6: Atualizar funções do banco para usar client_id
-- ============================================

-- Atualizar get_transaction_stats para usar client_id
CREATE OR REPLACE FUNCTION public.get_transaction_stats(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_billing_type text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_sck_code text DEFAULT NULL,
  p_product text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verificar acesso ao cliente
  IF p_client_id IS NOT NULL AND NOT public.user_has_client_access(p_client_id) THEN
    RETURN json_build_object(
      'total_by_currency', NULL,
      'total_by_country', NULL,
      'total_by_country_currency', NULL,
      'total_transactions', 0,
      'transactions_without_date', 0
    );
  END IF;

  WITH deduplicated_transactions AS (
    SELECT computed_value, currency, country, purchase_date
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
      AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
    
    UNION ALL
    
    SELECT 
      MIN(computed_value) as computed_value,
      MAX(currency) as currency,
      MAX(country) as country,
      MIN(purchase_date) as purchase_date
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
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
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND public.user_has_client_access(client_id)
        AND purchase_date IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Atualizar get_sales_by_date para usar client_id
CREATE OR REPLACE FUNCTION public.get_sales_by_date(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_billing_type text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_sck_code text DEFAULT NULL,
  p_product text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH deduplicated_transactions AS (
    SELECT computed_value, currency, purchase_date
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
      AND purchase_date IS NOT NULL
      AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
    
    UNION ALL
    
    SELECT 
      MIN(computed_value) as computed_value,
      MAX(currency) as currency,
      MIN(purchase_date) as purchase_date
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
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
$$;

-- Atualizar get_top_customers para usar client_id
CREATE OR REPLACE FUNCTION public.get_top_customers(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_billing_type text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_sck_code text DEFAULT NULL,
  p_product text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH deduplicated_transactions AS (
    SELECT buyer_email, buyer_name, computed_value, currency
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
      AND buyer_email IS NOT NULL
      AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
      AND (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
      AND (p_billing_type IS NULL OR billing_type = p_billing_type)
      AND (p_payment_method IS NULL OR payment_method = p_payment_method)
      AND (p_sck_code IS NULL OR sck_code = p_sck_code)
      AND (p_product IS NULL OR product = p_product)
    
    UNION ALL
    
    SELECT 
      buyer_email,
      MAX(buyer_name) as buyer_name,
      MIN(computed_value) as computed_value,
      MAX(currency) as currency
    FROM transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
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
$$;

-- Atualizar get_transaction_date_range para usar client_id
CREATE OR REPLACE FUNCTION public.get_transaction_date_range(p_client_id uuid DEFAULT NULL)
RETURNS json
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
  WHERE (p_client_id IS NULL OR client_id = p_client_id)
    AND public.user_has_client_access(client_id)
    AND purchase_date IS NOT NULL
  INTO result;
  
  RETURN result;
END;
$$;

-- Atualizar get_filter_options_with_counts para usar client_id
CREATE OR REPLACE FUNCTION public.get_filter_options_with_counts(p_client_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'billing_types', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', billing_type, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT billing_type, COUNT(*) as cnt
        FROM transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND billing_type IS NOT NULL
        GROUP BY billing_type
      ) sub
    ),
    'payment_methods', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', payment_method, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT payment_method, COUNT(*) as cnt
        FROM transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND payment_method IS NOT NULL
        GROUP BY payment_method
      ) sub
    ),
    'sck_codes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', sck_code, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT sck_code, COUNT(*) as cnt
        FROM transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND sck_code IS NOT NULL
        GROUP BY sck_code
      ) sub
    ),
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', product, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT product, COUNT(*) as cnt
        FROM transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND product IS NOT NULL
        GROUP BY product
      ) sub
    )
  );
END;
$$;

-- Atualizar get_tmb_transaction_stats para usar client_id
CREATE OR REPLACE FUNCTION public.get_tmb_transaction_stats(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
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
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND public.user_has_client_access(client_id)
        AND effective_date IS NULL
    )
  )
  FROM tmb_transactions
  WHERE (p_client_id IS NULL OR client_id = p_client_id)
    AND public.user_has_client_access(client_id)
    AND (p_start_date IS NULL OR effective_date >= p_start_date)
    AND (p_end_date IS NULL OR effective_date <= p_end_date)
  INTO result;
  
  RETURN result;
END;
$$;

-- Atualizar get_tmb_sales_by_date para usar client_id
CREATE OR REPLACE FUNCTION public.get_tmb_sales_by_date(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
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
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
      AND effective_date IS NOT NULL
      AND (p_start_date IS NULL OR effective_date >= p_start_date)
      AND (p_end_date IS NULL OR effective_date <= p_end_date)
    GROUP BY TO_CHAR(effective_date, 'YYYY-MM-DD')
  ) date_data INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Atualizar get_tmb_top_customers para usar client_id
CREATE OR REPLACE FUNCTION public.get_tmb_top_customers(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS json
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
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
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

-- Atualizar get_tmb_filter_options para usar client_id
CREATE OR REPLACE FUNCTION public.get_tmb_filter_options(p_client_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', product, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT product, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND product IS NOT NULL
        GROUP BY product
      ) sub
    ),
    'utm_sources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_source, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_source, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND utm_source IS NOT NULL
        GROUP BY utm_source
      ) sub
    ),
    'utm_mediums', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_medium, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_medium, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND utm_medium IS NOT NULL
        GROUP BY utm_medium
      ) sub
    ),
    'utm_campaigns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_campaign, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_campaign, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND public.user_has_client_access(client_id)
          AND utm_campaign IS NOT NULL
        GROUP BY utm_campaign
      ) sub
    )
  );
END;
$$;