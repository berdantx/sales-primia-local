-- Tabela para configuração de webhooks externos
CREATE TABLE public.external_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  schedule TEXT, -- cron expression (null = manual only)
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para histórico de disparos
CREATE TABLE public.webhook_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.external_webhooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL, -- 'success', 'error'
  response_code INTEGER,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for external_webhooks
CREATE POLICY "Users can view their own webhooks"
ON public.external_webhooks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhooks"
ON public.external_webhooks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks"
ON public.external_webhooks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks"
ON public.external_webhooks FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for webhook_dispatch_logs
CREATE POLICY "Users can view their own dispatch logs"
ON public.webhook_dispatch_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dispatch logs"
ON public.webhook_dispatch_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_external_webhooks_updated_at
BEFORE UPDATE ON public.external_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better query performance
CREATE INDEX idx_external_webhooks_user_id ON public.external_webhooks(user_id);
CREATE INDEX idx_external_webhooks_is_active ON public.external_webhooks(is_active);
CREATE INDEX idx_webhook_dispatch_logs_webhook_id ON public.webhook_dispatch_logs(webhook_id);
CREATE INDEX idx_webhook_dispatch_logs_created_at ON public.webhook_dispatch_logs(created_at DESC);