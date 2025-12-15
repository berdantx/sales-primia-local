CREATE OR REPLACE FUNCTION public.get_filter_options_with_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'billing_types', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', billing_type, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT billing_type, COUNT(*) as cnt
        FROM transactions
        WHERE user_id = auth.uid() AND billing_type IS NOT NULL
        GROUP BY billing_type
      ) sub
    ),
    'payment_methods', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', payment_method, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT payment_method, COUNT(*) as cnt
        FROM transactions
        WHERE user_id = auth.uid() AND payment_method IS NOT NULL
        GROUP BY payment_method
      ) sub
    ),
    'sck_codes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', sck_code, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT sck_code, COUNT(*) as cnt
        FROM transactions
        WHERE user_id = auth.uid() AND sck_code IS NOT NULL
        GROUP BY sck_code
      ) sub
    )
  );
END;
$$;