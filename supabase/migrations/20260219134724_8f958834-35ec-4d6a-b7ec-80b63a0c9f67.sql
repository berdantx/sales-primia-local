
-- Create table to log all duplicate deletions across platforms
CREATE TABLE public.duplicate_deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  platform text NOT NULL,
  transaction_identifier text NOT NULL,
  client_id uuid NOT NULL,
  deleted_by uuid NOT NULL,
  justification text NOT NULL,
  transaction_data jsonb NOT NULL,
  audit_type text NOT NULL DEFAULT 'id_duplicate',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.duplicate_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Master can insert
CREATE POLICY "Master users can insert duplicate deletion logs"
ON public.duplicate_deletion_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Master can view
CREATE POLICY "Master users can view duplicate deletion logs"
ON public.duplicate_deletion_logs
FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role));
