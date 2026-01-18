-- Add projected_value column to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS projected_value numeric DEFAULT 0;

-- Backup transactions that will be corrected (Recuperador Inteligente with inflated computed_value)
CREATE TABLE IF NOT EXISTS public.transactions_inverted_backup AS
SELECT *, now() as backup_created_at 
FROM public.transactions 
WHERE billing_type IN ('Recuperador Inteligente', 'Parcelamento Inteligente')
  AND computed_value > gross_value_with_taxes;

-- Correct Recuperador Inteligente and Parcelamento Inteligente transactions:
-- Move inflated computed_value to projected_value, set computed_value to actual installment value
UPDATE public.transactions
SET 
  projected_value = computed_value,
  computed_value = gross_value_with_taxes
WHERE billing_type IN ('Recuperador Inteligente', 'Parcelamento Inteligente')
  AND computed_value > gross_value_with_taxes;

-- For all other transactions: projected_value = computed_value (they received full amount)
UPDATE public.transactions
SET projected_value = computed_value
WHERE billing_type NOT IN ('Recuperador Inteligente', 'Parcelamento Inteligente')
  AND source IN ('hotmart', 'webhook')
  AND (projected_value = 0 OR projected_value IS NULL);

-- Also set projected_value for any remaining transactions
UPDATE public.transactions
SET projected_value = computed_value
WHERE projected_value = 0 OR projected_value IS NULL;

-- Create function to get sales breakdown by type
CREATE OR REPLACE FUNCTION public.get_sales_breakdown_by_type(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(row_to_json(breakdown))
  INTO result
  FROM (
    SELECT 
      CASE 
        WHEN t.billing_type IN ('Apenas à vista', 'À Vista') AND t.payment_method = 'Pix' THEN 'pix'
        WHEN t.billing_type IN ('Apenas à vista', 'À Vista') THEN 'a_vista'
        WHEN t.billing_type LIKE 'Parcelamento padrão%' OR t.billing_type = 'Parcelamento Padrão' THEN 'parcelado'
        WHEN t.billing_type = 'Recuperador Inteligente' THEN 'recuperador'
        WHEN t.billing_type = 'Parcelamento Inteligente' THEN 'parc_inteligente'
        ELSE 'outro'
      END as category,
      COUNT(*)::bigint as total_transactions,
      COALESCE(SUM(CASE WHEN t.currency = 'BRL' THEN t.computed_value ELSE 0 END), 0) as total_real_brl,
      COALESCE(SUM(CASE WHEN t.currency = 'USD' THEN t.computed_value ELSE 0 END), 0) as total_real_usd,
      COALESCE(SUM(CASE WHEN t.currency = 'BRL' THEN t.projected_value ELSE 0 END), 0) as total_projected_brl,
      COALESCE(SUM(CASE WHEN t.currency = 'USD' THEN t.projected_value ELSE 0 END), 0) as total_projected_usd
    FROM public.transactions t
    WHERE (p_client_id IS NULL OR t.client_id = p_client_id)
      AND (p_start_date IS NULL OR t.purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR t.purchase_date <= p_end_date)
    GROUP BY category
    ORDER BY total_transactions DESC
  ) breakdown;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create function to get transaction stats with projection
CREATE OR REPLACE FUNCTION public.get_transaction_stats_with_projection(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_billing_type text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_product text DEFAULT NULL,
  p_sck_code text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_real_brl', COALESCE(SUM(CASE WHEN t.currency = 'BRL' THEN t.computed_value ELSE 0 END), 0),
    'total_real_usd', COALESCE(SUM(CASE WHEN t.currency = 'USD' THEN t.computed_value ELSE 0 END), 0),
    'total_projected_brl', COALESCE(SUM(CASE WHEN t.currency = 'BRL' THEN t.projected_value ELSE 0 END), 0),
    'total_projected_usd', COALESCE(SUM(CASE WHEN t.currency = 'USD' THEN t.projected_value ELSE 0 END), 0),
    'total_transactions', COUNT(*)
  )
  INTO result
  FROM public.transactions t
  WHERE (p_client_id IS NULL OR t.client_id = p_client_id)
    AND (p_start_date IS NULL OR t.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR t.purchase_date <= p_end_date)
    AND (p_billing_type IS NULL OR t.billing_type = p_billing_type)
    AND (p_payment_method IS NULL OR t.payment_method = p_payment_method)
    AND (p_product IS NULL OR t.product = p_product)
    AND (p_sck_code IS NULL OR t.sck_code = p_sck_code);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;