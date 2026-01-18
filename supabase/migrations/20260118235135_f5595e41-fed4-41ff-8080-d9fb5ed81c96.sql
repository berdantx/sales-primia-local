-- Deletar TODAS as duplicatas de transações Eduzz em todos os clientes
-- Mantendo o registro mais antigo de cada grupo duplicado

DELETE FROM eduzz_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY client_id, buyer_email, sale_value, product, sale_date
        ORDER BY created_at ASC
      ) as row_num
    FROM eduzz_transactions
  ) ranked
  WHERE row_num > 1
);

-- Agora criar o índice único para prevenir futuras duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_eduzz_unique_transaction 
ON eduzz_transactions (client_id, buyer_email, sale_value, product, sale_date)
WHERE buyer_email IS NOT NULL AND sale_date IS NOT NULL;