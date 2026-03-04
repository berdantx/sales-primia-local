
CREATE INDEX IF NOT EXISTS idx_leads_client_created_desc 
ON public.leads (client_id, created_at DESC);
