-- Criar tabela para leads de interesse da landing page
CREATE TABLE public.interest_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  instagram TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice único no email para evitar duplicatas
CREATE UNIQUE INDEX interest_leads_email_idx ON public.interest_leads (email);

-- Habilitar RLS
ALTER TABLE public.interest_leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT anônimo (visitantes da landing page)
CREATE POLICY "Allow anonymous insert"
ON public.interest_leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Política para masters visualizarem todos os leads
CREATE POLICY "Masters can view all interest leads"
ON public.interest_leads
FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role));

-- Política para masters atualizarem leads
CREATE POLICY "Masters can update interest leads"
ON public.interest_leads
FOR UPDATE
USING (has_role(auth.uid(), 'master'::app_role));

-- Política para masters deletarem leads
CREATE POLICY "Masters can delete interest leads"
ON public.interest_leads
FOR DELETE
USING (has_role(auth.uid(), 'master'::app_role));