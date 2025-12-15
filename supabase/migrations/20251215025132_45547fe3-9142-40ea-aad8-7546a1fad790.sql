-- Create RPC function to get TMB filter options with counts
CREATE OR REPLACE FUNCTION public.get_tmb_filter_options()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', product, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT product, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE user_id = auth.uid() AND product IS NOT NULL
        GROUP BY product
      ) sub
    ),
    'utm_sources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_source, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_source, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE user_id = auth.uid() AND utm_source IS NOT NULL
        GROUP BY utm_source
      ) sub
    ),
    'utm_mediums', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_medium, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_medium, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE user_id = auth.uid() AND utm_medium IS NOT NULL
        GROUP BY utm_medium
      ) sub
    ),
    'utm_campaigns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', utm_campaign, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT utm_campaign, COUNT(*) as cnt
        FROM tmb_transactions
        WHERE user_id = auth.uid() AND utm_campaign IS NOT NULL
        GROUP BY utm_campaign
      ) sub
    )
  );
END;
$$;