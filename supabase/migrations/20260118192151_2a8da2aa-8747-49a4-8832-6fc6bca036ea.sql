-- Adicionar novos campos na tabela transactions para suportar dados completos do Hotmart
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS business_model TEXT,
ADD COLUMN IF NOT EXISTS offer_code TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS product_ucode TEXT,
ADD COLUMN IF NOT EXISTS marketplace_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS producer_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS recurrence_number INTEGER,
ADD COLUMN IF NOT EXISTS subscriber_code TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS date_next_charge TIMESTAMP WITH TIME ZONE;

-- Adicionar índices para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_transactions_offer_code ON public.transactions(offer_code);
CREATE INDEX IF NOT EXISTS idx_transactions_subscriber_code ON public.transactions(subscriber_code);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON public.transactions(product_id);

-- Comentários para documentação
COMMENT ON COLUMN public.transactions.business_model IS 'Modelo de negócio Hotmart (I = Individual, A = Afiliado, etc.)';
COMMENT ON COLUMN public.transactions.offer_code IS 'Código da oferta no Hotmart';
COMMENT ON COLUMN public.transactions.product_id IS 'ID do produto no Hotmart';
COMMENT ON COLUMN public.transactions.product_ucode IS 'UUID único do produto no Hotmart';
COMMENT ON COLUMN public.transactions.marketplace_commission IS 'Comissão do marketplace Hotmart';
COMMENT ON COLUMN public.transactions.producer_commission IS 'Comissão do produtor';
COMMENT ON COLUMN public.transactions.recurrence_number IS 'Número da recorrência (para assinaturas)';
COMMENT ON COLUMN public.transactions.subscriber_code IS 'Código do assinante Hotmart';
COMMENT ON COLUMN public.transactions.subscription_status IS 'Status da assinatura (ACTIVE, CANCELLED, etc.)';
COMMENT ON COLUMN public.transactions.date_next_charge IS 'Próxima data de cobrança (para recorrências)';