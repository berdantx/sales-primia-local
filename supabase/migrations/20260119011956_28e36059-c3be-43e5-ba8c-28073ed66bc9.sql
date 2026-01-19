-- Corrigir classificação de transações históricas
-- Problema: transações com payment_method 'Parcelado Hotmart' foram classificadas como 'Recuperador Inteligente'
-- quando deveriam ser 'Parcelamento Inteligente'

-- PASSO 1: Transações com payment_method 'Parcelado Hotmart' que estão como 
-- 'Recuperador Inteligente' devem ser 'Parcelamento Inteligente'
UPDATE transactions
SET billing_type = 'Parcelamento Inteligente'
WHERE payment_method = 'Parcelado Hotmart'
  AND billing_type = 'Recuperador Inteligente'
  AND total_installments > 1;

-- PASSO 2: Transações com payment_method 'Pix' ou 'Boleto' que têm 
-- subscriber_code e recurrence_number devem ser 'Recuperador Inteligente'
-- (se ainda não estiverem classificadas assim)
UPDATE transactions
SET billing_type = 'Recuperador Inteligente'
WHERE payment_method IN ('Pix', 'Boleto')
  AND subscriber_code IS NOT NULL
  AND recurrence_number IS NOT NULL
  AND recurrence_number > 0
  AND total_installments > 1
  AND billing_type NOT IN ('Recuperador Inteligente', 'Parcelamento Inteligente');

-- PASSO 3: Atualizar a transação HP1180263022 com os dados corretos do webhook
-- que estavam faltando (foi importada via CSV sem esses dados)
UPDATE transactions
SET 
  recurrence_number = 2,
  subscriber_code = 'UN8TXW24',
  subscription_status = 'ACTIVE',
  payment_method = 'Parcelado Hotmart',
  billing_type = 'Parcelamento Inteligente'
WHERE transaction_code = 'HP1180263022';