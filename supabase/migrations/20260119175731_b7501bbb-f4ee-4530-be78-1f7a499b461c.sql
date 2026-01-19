-- Drop and recreate get_eduzz_filter_options with correct format and utm_contents
CREATE OR REPLACE FUNCTION public.get_eduzz_filter_options(p_client_id uuid DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'products', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT product AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE user_has_client_access(e.client_id)
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND product IS NOT NULL AND product != ''
        GROUP BY product
        ORDER BY count DESC
      ) t
    ),
    'utm_sources', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_source AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE user_has_client_access(e.client_id)
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_source IS NOT NULL AND utm_source != ''
        GROUP BY utm_source
        ORDER BY count DESC
      ) t
    ),
    'utm_mediums', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_medium AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE user_has_client_access(e.client_id)
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_medium IS NOT NULL AND utm_medium != ''
        GROUP BY utm_medium
        ORDER BY count DESC
      ) t
    ),
    'utm_campaigns', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_campaign AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE user_has_client_access(e.client_id)
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_campaign IS NOT NULL AND utm_campaign != ''
        GROUP BY utm_campaign
        ORDER BY count DESC
      ) t
    ),
    'utm_contents', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT utm_content AS value, COUNT(*)::int AS count
        FROM eduzz_transactions e
        WHERE user_has_client_access(e.client_id)
          AND (p_client_id IS NULL OR e.client_id = p_client_id)
          AND utm_content IS NOT NULL AND utm_content != ''
        GROUP BY utm_content
        ORDER BY count DESC
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;