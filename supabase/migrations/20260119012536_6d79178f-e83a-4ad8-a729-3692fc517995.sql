-- Corrigir valores computados de transações "Parcelamento Inteligente"
-- Problema: computed_value e projected_value foram inflados multiplicando por total_installments
-- quando o gross_value_with_taxes já representa o valor TOTAL da compra

-- Corrigir transações onde computed_value foi incorretamente multiplicado
UPDATE transactions
SET 
  computed_value = gross_value_with_taxes,
  projected_value = gross_value_with_taxes
WHERE billing_type = 'Parcelamento Inteligente'
  AND total_installments > 1
  AND computed_value > gross_value_with_taxes;