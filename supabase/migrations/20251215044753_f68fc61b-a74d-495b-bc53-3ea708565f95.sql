-- Create webhook_logs table for storing webhook execution history
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  transaction_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('processed', 'skipped', 'error')),
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_webhook_logs_user_created ON public.webhook_logs(user_id, created_at DESC);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX idx_webhook_logs_transaction_code ON public.webhook_logs(transaction_code);

-- Enable Row Level Security
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own logs
CREATE POLICY "Users can view own webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for webhook to insert logs (uses service role, so needs permissive insert)
CREATE POLICY "Service role can insert webhook logs" 
ON public.webhook_logs 
FOR INSERT 
WITH CHECK (true);