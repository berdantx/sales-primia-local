
-- Add original_currency and original_value to eduzz_transactions
ALTER TABLE public.eduzz_transactions
  ADD COLUMN IF NOT EXISTS original_currency text,
  ADD COLUMN IF NOT EXISTS original_value numeric;

-- Add original_currency and original_value to transactions (Hotmart)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_currency text,
  ADD COLUMN IF NOT EXISTS original_value numeric;
