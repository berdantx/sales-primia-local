-- Create permission audit log table
CREATE TABLE public.permission_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  action text NOT NULL, -- 'granted' or 'revoked'
  permission_type text NOT NULL DEFAULT 'financial_access',
  old_value boolean,
  new_value boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only masters can view audit logs
CREATE POLICY "Masters can view permission audit logs"
ON public.permission_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'master'));

-- System can insert audit logs (via service role or authenticated users)
CREATE POLICY "Authenticated users can insert permission audit logs"
ON public.permission_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = changed_by);

-- Add index for faster queries
CREATE INDEX idx_permission_audit_client ON public.permission_audit_logs(client_id);
CREATE INDEX idx_permission_audit_target ON public.permission_audit_logs(target_user_id);
CREATE INDEX idx_permission_audit_changed_by ON public.permission_audit_logs(changed_by);

-- Add comment for documentation
COMMENT ON TABLE public.permission_audit_logs IS 'Logs de auditoria de alterações de permissões financeiras';