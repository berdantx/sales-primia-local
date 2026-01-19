-- Corrigir projected_value para transações "Parcelamento Inteligente" com recurrence_number
-- 1ª parcela: projected_value = computed_value × total_installments (projeção total)
UPDATE transactions
SET projected_value = computed_value * total_installments
WHERE billing_type = 'Parcelamento Inteligente'
  AND recurrence_number = 1
  AND total_installments > 1
  AND computed_value IS NOT NULL;

-- Parcelas subsequentes: projected_value = computed_value (já projetado na 1ª parcela)
UPDATE transactions
SET projected_value = computed_value
WHERE billing_type = 'Parcelamento Inteligente'
  AND recurrence_number > 1
  AND total_installments > 1
  AND computed_value IS NOT NULL;

-- Para transações de Parcelamento Inteligente importadas via CSV (sem recurrence_number)
-- Assumimos que cada linha é uma parcela e projetamos o total
UPDATE transactions
SET projected_value = computed_value * total_installments
WHERE billing_type = 'Parcelamento Inteligente'
  AND recurrence_number IS NULL
  AND total_installments > 1
  AND computed_value IS NOT NULL
  AND (projected_value IS NULL OR projected_value = computed_value);

-- Para Recuperador Inteligente: mesma lógica
UPDATE transactions
SET projected_value = computed_value * total_installments
WHERE billing_type = 'Recuperador Inteligente'
  AND recurrence_number = 1
  AND total_installments > 1
  AND computed_value IS NOT NULL;

UPDATE transactions
SET projected_value = computed_value
WHERE billing_type = 'Recuperador Inteligente'
  AND recurrence_number > 1
  AND total_installments > 1
  AND computed_value IS NOT NULL;