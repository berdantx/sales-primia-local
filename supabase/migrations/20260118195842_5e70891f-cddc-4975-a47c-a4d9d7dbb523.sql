-- Backup das transações que serão corrigidas
CREATE TABLE IF NOT EXISTS transactions_computed_backup AS
SELECT *, now() as backup_created_at 
FROM transactions 
WHERE source IN ('hotmart', 'webhook')
  AND computed_value > 1997.03;

-- Corrigir computed_value para R$ 1.997,03 nas transações afetadas
UPDATE transactions
SET computed_value = 1997.03
WHERE source IN ('hotmart', 'webhook')
  AND computed_value > 1997.03;