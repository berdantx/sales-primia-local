
-- Table to track backup history for dashboard
CREATE TABLE public.backup_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tables_included text[] NOT NULL DEFAULT '{}',
  total_records integer DEFAULT 0,
  file_size_bytes bigint DEFAULT 0,
  duration_ms integer DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can view all backup logs"
ON public.backup_logs FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Admins can view their own backup logs"
ON public.backup_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert backup logs"
ON public.backup_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update backup logs"
ON public.backup_logs FOR UPDATE
USING (true);
