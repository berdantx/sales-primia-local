
-- 1. Primeiro remover a constraint antiga para permitir as atualizações
ALTER TABLE eduzz_transactions DROP CONSTRAINT IF EXISTS eduzz_transactions_user_sale_unique;

-- 2. Corrigir sale_id em eduzz_transactions usando os payloads dos webhook_logs
UPDATE eduzz_transactions et
SET sale_id = (wl.payload->'data'->>'id')
FROM webhook_logs wl
WHERE wl.transaction_code = et.sale_id
  AND wl.event_type LIKE 'EDUZZ%'
  AND wl.status = 'processed'
  AND wl.payload->'data'->>'id' IS NOT NULL
  AND et.source = 'webhook'
  AND et.sale_id !~ '^[0-9]+$';

-- 3. Remover duplicatas que impediriam a nova constraint (client_id, sale_id)
-- Mantém o registro mais recente de cada par (client_id, sale_id)
DELETE FROM eduzz_transactions
WHERE id NOT IN (
  SELECT DISTINCT ON (client_id, sale_id) id
  FROM eduzz_transactions
  ORDER BY client_id, sale_id, created_at DESC
);

-- 4. Corrigir transaction_code nos webhook_logs
UPDATE webhook_logs
SET transaction_code = (payload->'data'->>'id')
WHERE event_type LIKE 'EDUZZ%'
  AND payload->'data'->>'id' IS NOT NULL
  AND transaction_code !~ '^[0-9]+$';

-- 5. Criar nova constraint de unicidade
ALTER TABLE eduzz_transactions ADD CONSTRAINT eduzz_transactions_client_sale_unique UNIQUE (client_id, sale_id);
