
CREATE OR REPLACE FUNCTION public.get_lead_summary_stats(p_client_id text DEFAULT NULL::text, p_start_date text DEFAULT NULL::text, p_end_date text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_total bigint;
  v_by_traffic jsonb;
BEGIN
  v_client_id := CASE WHEN p_client_id IS NOT NULL AND p_client_id <> '' THEN p_client_id::uuid ELSE NULL END;
  v_start := CASE WHEN p_start_date IS NOT NULL AND p_start_date <> '' THEN p_start_date::timestamptz ELSE NULL END;
  v_end := CASE WHEN p_end_date IS NOT NULL AND p_end_date <> '' THEN p_end_date::timestamptz ELSE NULL END;

  IF v_client_id IS NOT NULL AND NOT user_has_client_access(v_client_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    COALESCE(SUM(cnt), 0)::bigint,
    COALESCE(jsonb_object_agg(tt, cnt) FILTER (WHERE tt IS NOT NULL), '{}'::jsonb)
  INTO v_total, v_by_traffic
  FROM (
    SELECT
      COALESCE(l.traffic_type, 'direct') AS tt,
      COUNT(*) AS cnt
    FROM leads l
    WHERE (v_client_id IS NULL OR l.client_id = v_client_id)
      AND (v_start IS NULL OR l.created_at >= v_start)
      AND (v_end IS NULL OR l.created_at <= v_end)
    GROUP BY COALESCE(l.traffic_type, 'direct')
  ) sub;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'by_traffic_type', COALESCE(v_by_traffic, '{}'::jsonb)
  );
END;
$function$;
