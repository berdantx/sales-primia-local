
-- Tabela de coprodutores
CREATE TABLE public.client_coproducers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

ALTER TABLE public.client_coproducers ENABLE ROW LEVEL SECURITY;

-- Tabela de taxas por produto
CREATE TABLE public.coproducer_product_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coproducer_id uuid NOT NULL REFERENCES public.client_coproducers(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  rate_percent numeric NOT NULL CHECK (rate_percent > 0 AND rate_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coproducer_id, product_name)
);

ALTER TABLE public.coproducer_product_rates ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_coproducer_rates_updated_at
  BEFORE UPDATE ON public.coproducer_product_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Masters gerenciam tudo
CREATE POLICY "Masters can manage coproducers"
  ON public.client_coproducers FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Users can view own coproducer records"
  ON public.client_coproducers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Masters can manage rates"
  ON public.coproducer_product_rates FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Users can view rates of own coproductions"
  ON public.coproducer_product_rates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_coproducers
    WHERE client_coproducers.id = coproducer_product_rates.coproducer_id
    AND client_coproducers.user_id = auth.uid()
  ));
