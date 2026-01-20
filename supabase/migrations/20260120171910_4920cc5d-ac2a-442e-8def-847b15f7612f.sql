-- Adicionar buyer_phone em transactions (Hotmart)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_phone text;

-- Adicionar buyer_phone em tmb_transactions
ALTER TABLE tmb_transactions ADD COLUMN IF NOT EXISTS buyer_phone text;

-- Índices para busca eficiente por telefone
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_phone ON transactions(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_tmb_transactions_buyer_phone ON tmb_transactions(buyer_phone);