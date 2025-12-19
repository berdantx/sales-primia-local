-- Create access_logs table for security auditing
CREATE TABLE public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at DESC);
CREATE INDEX idx_access_logs_event_type ON access_logs(event_type);

-- Enable RLS
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Masters can view all access logs
CREATE POLICY "Masters can view all access logs"
  ON access_logs FOR SELECT
  USING (has_role(auth.uid(), 'master'));

-- Users can view their own access logs
CREATE POLICY "Users can view own access logs"
  ON access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert logs (for edge functions)
CREATE POLICY "Service role can insert access logs"
  ON access_logs FOR INSERT
  WITH CHECK (true);