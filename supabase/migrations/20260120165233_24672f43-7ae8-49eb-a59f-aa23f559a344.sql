-- Tabela para rastrear landing pages conhecidas por cliente
CREATE TABLE public.known_landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  normalized_url TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Garantir unicidade por cliente + URL
  UNIQUE(client_id, normalized_url)
);

-- Índices para performance
CREATE INDEX idx_known_landing_pages_client_id ON public.known_landing_pages(client_id);
CREATE INDEX idx_known_landing_pages_first_seen ON public.known_landing_pages(first_seen_at DESC);

-- Habilitar RLS
ALTER TABLE public.known_landing_pages ENABLE ROW LEVEL SECURITY;

-- Política de leitura: usuários com acesso ao cliente podem ver
CREATE POLICY "Users can view known landing pages for their clients"
ON public.known_landing_pages
FOR SELECT
USING (public.user_has_client_access(client_id));

-- Política de inserção: apenas o sistema (via service role) pode inserir
CREATE POLICY "System can insert known landing pages"
ON public.known_landing_pages
FOR INSERT
WITH CHECK (true);

-- Política de atualização: apenas o sistema pode atualizar
CREATE POLICY "System can update known landing pages"
ON public.known_landing_pages
FOR UPDATE
USING (true);

-- Comentário na tabela
COMMENT ON TABLE public.known_landing_pages IS 'Rastreia landing pages conhecidas por cliente para detectar novas páginas de testes A/B';