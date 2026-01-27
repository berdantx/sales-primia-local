-- Create lead_deletion_logs table for audit trail
CREATE TABLE public.lead_deletion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  client_id UUID NOT NULL,
  deleted_by UUID NOT NULL,
  justification TEXT NOT NULL,
  lead_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_deletion_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Masters can view all lead deletion logs"
ON public.lead_deletion_logs
FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Users can view lead deletion logs of their clients"
ON public.lead_deletion_logs
FOR SELECT
USING (user_has_client_access(client_id));

CREATE POLICY "Users can insert lead deletion logs for their clients"
ON public.lead_deletion_logs
FOR INSERT
WITH CHECK (user_has_client_access(client_id) AND auth.uid() = deleted_by);

-- Add index for better query performance
CREATE INDEX idx_lead_deletion_logs_client_id ON public.lead_deletion_logs(client_id);
CREATE INDEX idx_lead_deletion_logs_created_at ON public.lead_deletion_logs(created_at DESC);