
ALTER TABLE eduzz_transactions 
  ADD COLUMN status text NOT NULL DEFAULT 'paid',
  ADD COLUMN cancelled_at timestamptz;
