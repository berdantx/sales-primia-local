-- Criar índice único para prevenir duplicatas em Hotmart (transactions)
-- Baseado em client_id, buyer_email, computed_value, product, purchase_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotmart_unique_transaction 
ON transactions (client_id, buyer_email, computed_value, product, purchase_date)
WHERE buyer_email IS NOT NULL AND purchase_date IS NOT NULL;