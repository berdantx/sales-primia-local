
-- Adicionar colunas status e cancelled_at
ALTER TABLE tmb_transactions 
  ADD COLUMN status text NOT NULL DEFAULT 'efetivado',
  ADD COLUMN cancelled_at timestamptz;

-- Índice para filtros rápidos por status
CREATE INDEX idx_tmb_status ON tmb_transactions(status);

-- Backfill: marcar como canceladas as transações que têm TMB_ORDER_CANCELADO nos webhook_logs
UPDATE tmb_transactions t
SET status = 'cancelado', cancelled_at = wl.created_at
FROM (
  SELECT DISTINCT ON (transaction_code) transaction_code, created_at
  FROM webhook_logs
  WHERE event_type = 'TMB_ORDER_CANCELADO'
  ORDER BY transaction_code, created_at DESC
) wl
WHERE t.order_id = wl.transaction_code;

-- Atualizar RPC get_tmb_transaction_stats para incluir dados de cancelamento
CREATE OR REPLACE FUNCTION get_tmb_transaction_stats(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_brl', COALESCE(SUM(CASE WHEN t.status = 'efetivado' THEN t.ticket_value ELSE 0 END), 0),
    'total_transactions', COUNT(*) FILTER (WHERE t.status = 'efetivado'),
    'transactions_without_date', COUNT(*) FILTER (WHERE t.effective_date IS NULL AND t.status = 'efetivado'),
    'cancelled_total', COALESCE(SUM(CASE WHEN t.status = 'cancelado' THEN t.ticket_value ELSE 0 END), 0),
    'cancelled_count', COUNT(*) FILTER (WHERE t.status = 'cancelado')
  ) INTO result
  FROM public.tmb_transactions t
  WHERE (p_client_id IS NULL OR t.client_id = p_client_id)
    AND (p_start_date IS NULL OR t.effective_date >= p_start_date)
    AND (p_end_date IS NULL OR t.effective_date <= p_end_date);

  RETURN result;
END;
$$;
