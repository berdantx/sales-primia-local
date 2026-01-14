-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Vínculo com cliente
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Identificação do lead
  external_id TEXT,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  ip_address TEXT,
  
  -- Organização
  organization TEXT,
  customer_account TEXT,
  
  -- Tags e categorização
  tags TEXT,
  
  -- UTMs completos
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_id TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Origem
  source TEXT DEFAULT 'active_campaign',
  page_url TEXT,
  series_id TEXT,
  
  -- Dados brutos para referência
  raw_payload JSONB
);

-- Índices para performance
CREATE INDEX idx_leads_client_id ON public.leads(client_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_utm_source ON public.leads(utm_source);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies usando a função existente user_has_client_access
CREATE POLICY "Users can view leads of their clients"
  ON public.leads FOR SELECT
  USING (user_has_client_access(client_id));

CREATE POLICY "Users can insert leads for their clients"
  ON public.leads FOR INSERT
  WITH CHECK (user_has_client_access(client_id));

CREATE POLICY "Users can update leads of their clients"
  ON public.leads FOR UPDATE
  USING (user_has_client_access(client_id));

CREATE POLICY "Users can delete leads of their clients"
  ON public.leads FOR DELETE
  USING (user_has_client_access(client_id));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();