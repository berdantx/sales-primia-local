-- Criar índice único para prevenir duplicatas em TMB
-- Baseado em client_id, buyer_email, ticket_value, product, effective_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_tmb_unique_transaction 
ON tmb_transactions (client_id, buyer_email, ticket_value, product, effective_date)
WHERE buyer_email IS NOT NULL AND effective_date IS NOT NULL;