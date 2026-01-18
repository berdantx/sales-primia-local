-- FASE 1: Criar tabela de backup interna
CREATE TABLE public.transactions_backup_20260118 AS 
SELECT 
  *,
  NOW() as backup_created_at
FROM public.transactions
WHERE source = 'webhook';

-- Adicionar comentário explicativo
COMMENT ON TABLE public.transactions_backup_20260118 IS 
  'Backup antes da correção computed_value/gross_value_with_taxes - 18/01/2026';

-- Criar índice para consultas rápidas
CREATE INDEX idx_backup_20260118_transaction_code ON public.transactions_backup_20260118(transaction_code);

-- FASE 2: Corrigir valores invertidos (swap computed_value <-> gross_value_with_taxes)
-- Apenas onde os valores são diferentes (88 transações identificadas)
UPDATE public.transactions
SET 
  gross_value_with_taxes = computed_value,
  computed_value = gross_value_with_taxes
WHERE 
  source = 'webhook'
  AND billing_type = 'Webhook'
  AND computed_value != gross_value_with_taxes;

-- FASE 3: Corrigir billing_type baseado em total_installments
UPDATE public.transactions
SET 
  billing_type = CASE
    WHEN total_installments > 1 THEN 'Parcelamento Padrão'
    ELSE 'À Vista'
  END
WHERE 
  source = 'webhook'
  AND billing_type = 'Webhook';