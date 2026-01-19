
-- Fix historical transactions with missing recurrence_number
-- Extract from webhook_logs payload (supports both v1 and v2 formats)

UPDATE transactions t
SET recurrence_number = COALESCE(
  -- v1 format: payload.purchase.recurrence_number
  (wl.payload->'purchase'->>'recurrence_number')::integer,
  -- v2 format: payload.data.purchase.recurrence_number
  (wl.payload->'data'->'purchase'->>'recurrence_number')::integer
),
-- Also update billing_type to "Recuperador Inteligente" if it's a monthly payment
billing_type = CASE 
  WHEN t.billing_type = 'Recorrência' AND COALESCE(
    (wl.payload->'purchase'->>'recurrence_number')::integer,
    (wl.payload->'data'->'purchase'->>'recurrence_number')::integer
  ) > 0 AND t.total_installments > 1 
  THEN 'Recuperador Inteligente'
  ELSE t.billing_type
END
FROM webhook_logs wl
WHERE t.transaction_code = wl.transaction_code
  AND t.subscriber_code IS NOT NULL
  AND t.recurrence_number IS NULL
  AND t.total_installments > 1
  AND wl.status = 'processed'
  AND (
    (wl.payload->'purchase'->>'recurrence_number') IS NOT NULL
    OR (wl.payload->'data'->'purchase'->>'recurrence_number') IS NOT NULL
  );
