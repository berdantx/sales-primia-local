-- Create table for Eduzz transaction deletion logs (audit trail)
CREATE TABLE public.eduzz_transaction_deletion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL,
  sale_id TEXT NOT NULL,
  client_id UUID NOT NULL,
  deleted_by UUID NOT NULL,
  justification TEXT NOT NULL,
  transaction_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eduzz_transaction_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Only master users can view deletion logs
CREATE POLICY "Master users can view deletion logs"
  ON public.eduzz_transaction_deletion_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'master'));

-- Only master users can insert deletion logs
CREATE POLICY "Master users can insert deletion logs"
  ON public.eduzz_transaction_deletion_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Add index for faster queries
CREATE INDEX idx_eduzz_deletion_logs_client ON public.eduzz_transaction_deletion_logs(client_id);
CREATE INDEX idx_eduzz_deletion_logs_deleted_by ON public.eduzz_transaction_deletion_logs(deleted_by);