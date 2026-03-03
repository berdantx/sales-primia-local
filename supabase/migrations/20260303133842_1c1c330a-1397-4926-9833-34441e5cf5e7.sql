
CREATE OR REPLACE FUNCTION public.get_client_lead_counts()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_object_agg(client_id, cnt),
    '{}'::json
  )
  FROM (
    SELECT client_id, count(*)::int as cnt
    FROM public.leads
    WHERE client_id IS NOT NULL
    GROUP BY client_id
  ) s;
$$;
