ALTER TABLE public.eduzz_transactions
  ADD COLUMN total_installments integer,
  ADD COLUMN payment_method text,
  ADD COLUMN payment_form text;