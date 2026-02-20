
CREATE TABLE public.currency_conversion_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  platform text NOT NULL,
  sale_id text,
  original_currency text NOT NULL,
  original_value numeric NOT NULL,
  converted_value numeric NOT NULL,
  conversion_rate numeric NOT NULL DEFAULT 1,
  conversion_source text NOT NULL DEFAULT 'none',
  alert_type text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.currency_conversion_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters and admins can view alerts"
  ON public.currency_conversion_alerts FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Masters can update alerts"
  ON public.currency_conversion_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "System can insert alerts"
  ON public.currency_conversion_alerts FOR INSERT
  WITH CHECK (true);
