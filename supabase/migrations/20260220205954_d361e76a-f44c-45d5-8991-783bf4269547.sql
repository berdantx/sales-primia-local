
CREATE OR REPLACE FUNCTION public.get_coproducer_commissions(
  p_coproducer_ids text[],
  p_date_from text DEFAULT NULL
)
RETURNS TABLE(
  coproducer_id uuid,
  client_id uuid,
  client_name text,
  product_name text,
  rate_percent numeric,
  hotmart_total numeric,
  tmb_total numeric,
  eduzz_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_from timestamptz;
  v_coproducer_ids uuid[];
BEGIN
  -- Convert text array to uuid array
  v_coproducer_ids := ARRAY(SELECT unnest(p_coproducer_ids)::uuid);
  
  -- Convert date string
  IF p_date_from IS NOT NULL AND p_date_from <> '' THEN
    v_date_from := p_date_from::timestamptz;
  END IF;

  RETURN QUERY
  SELECT
    cp.id AS coproducer_id,
    cp.client_id,
    c.name AS client_name,
    r.product_name,
    r.rate_percent,
    COALESCE((
      SELECT SUM(t.computed_value)
      FROM transactions t
      WHERE t.client_id = cp.client_id
        AND t.product = r.product_name
        AND (v_date_from IS NULL OR t.purchase_date >= v_date_from)
    ), 0)::numeric AS hotmart_total,
    COALESCE((
      SELECT SUM(tt.ticket_value)
      FROM tmb_transactions tt
      WHERE tt.client_id = cp.client_id
        AND tt.product = r.product_name
        AND tt.cancelled_at IS NULL
        AND (v_date_from IS NULL OR tt.effective_date >= v_date_from)
    ), 0)::numeric AS tmb_total,
    COALESCE((
      SELECT SUM(et.sale_value)
      FROM eduzz_transactions et
      WHERE et.client_id = cp.client_id
        AND et.product = r.product_name
        AND et.status = 'paid'
        AND (v_date_from IS NULL OR et.sale_date >= v_date_from)
    ), 0)::numeric AS eduzz_total
  FROM client_coproducers cp
  JOIN clients c ON c.id = cp.client_id
  JOIN coproducer_product_rates r ON r.coproducer_id = cp.id
  WHERE cp.id = ANY(v_coproducer_ids);
END;
$$;
