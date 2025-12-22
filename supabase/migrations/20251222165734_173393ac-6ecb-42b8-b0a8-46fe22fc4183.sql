-- Atualizar get_sales_by_date para usar timezone de Brasília
CREATE OR REPLACE FUNCTION public.get_sales_by_date(
  p_client_id uuid DEFAULT NULL::uuid,
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
      TO_CHAR(purchase_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as date,
      json_object_agg(currency, total) as currencies
    FROM (
      SELECT 
        DATE(purchase_date AT TIME ZONE 'America/Sao_Paulo') as purchase_date,
        currency,
        SUM(computed_value) as total
      FROM deduplicated_transactions
      GROUP BY DATE(purchase_date AT TIME ZONE 'America/Sao_Paulo'), currency
    ) daily_totals
    GROUP BY TO_CHAR(purchase_date, 'YYYY-MM-DD')
  ) date_data INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$function$;

-- Atualizar get_tmb_sales_by_date para usar timezone de Brasília
CREATE OR REPLACE FUNCTION public.get_tmb_sales_by_date(
  p_client_id uuid DEFAULT NULL::uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(date, currencies)
  FROM (
    SELECT 
      TO_CHAR(effective_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as date,
      json_build_object('BRL', SUM(ticket_value)) as currencies
    FROM tmb_transactions
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)
      AND effective_date IS NOT NULL
      AND (p_start_date IS NULL OR effective_date >= p_start_date)
      AND (p_end_date IS NULL OR effective_date <= p_end_date)
    GROUP BY TO_CHAR(effective_date AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
  ) date_data INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$function$;