-- Fix historical transactions with billing_type = 'Parcelamento Inteligente'
-- These have incorrect computed_value (single installment instead of total)
-- computed_value should be: gross_value_with_taxes * total_installments

UPDATE transactions
SET 
  computed_value = gross_value_with_taxes * total_installments,
  projected_value = gross_value_with_taxes * total_installments
WHERE billing_type = 'Parcelamento Inteligente'
  AND total_installments > 1
  AND computed_value = gross_value_with_taxes;