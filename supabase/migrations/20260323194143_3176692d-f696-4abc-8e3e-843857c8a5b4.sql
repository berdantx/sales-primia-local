
CREATE TABLE public.dollar_rate_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate numeric NOT NULL,
  source text NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dollar_rate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dollar rate cache"
  ON public.dollar_rate_cache FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert dollar rate cache"
  ON public.dollar_rate_cache FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Service role can update dollar rate cache"
  ON public.dollar_rate_cache FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Service role can delete dollar rate cache"
  ON public.dollar_rate_cache FOR DELETE
  TO public
  USING (true);
