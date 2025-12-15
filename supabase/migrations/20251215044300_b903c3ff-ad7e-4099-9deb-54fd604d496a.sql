-- Add unique constraint for upsert on transactions
ALTER TABLE transactions 
ADD CONSTRAINT transactions_code_user_unique 
UNIQUE (transaction_code, user_id);