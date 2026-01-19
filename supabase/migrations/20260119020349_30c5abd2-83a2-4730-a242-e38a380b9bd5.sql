-- Passo 1: Atualizar recurrence_number baseado na ordem cronológica
-- Identifica parcelas pelo buyer_email + product e ordena por data
WITH parcelas_numeradas AS (
  SELECT 
    id,
    buyer_email,
    product,
    ROW_NUMBER() OVER (
      PARTITION BY buyer_email, product 
      ORDER BY purchase_date
    ) as numero_parcela
  FROM transactions
  WHERE source = 'hotmart'
    AND billing_type IN ('Parcelamento Inteligente', 'Recuperador Inteligente')
    AND total_installments > 1
    AND recurrence_number IS NULL
)
UPDATE transactions t
SET recurrence_number = p.numero_parcela
FROM parcelas_numeradas p
WHERE t.id = p.id;

-- Passo 2: Corrigir projected_value para 1ª parcela (projeção total)
UPDATE transactions
SET projected_value = computed_value * total_installments
WHERE billing_type IN ('Parcelamento Inteligente', 'Recuperador Inteligente')
  AND recurrence_number = 1
  AND total_installments > 1;

-- Passo 3: Corrigir projected_value para parcelas subsequentes (apenas valor da parcela)
UPDATE transactions
SET projected_value = computed_value
WHERE billing_type IN ('Parcelamento Inteligente', 'Recuperador Inteligente')
  AND recurrence_number > 1
  AND total_installments > 1;