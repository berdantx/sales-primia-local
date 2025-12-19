
-- Drop and recreate get_filter_options_with_counts with deduplication logic
CREATE OR REPLACE FUNCTION public.get_filter_options_with_counts(p_client_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'billing_types', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', billing_type, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        WITH deduplicated AS (
          -- Normal transactions (not Recuperador Inteligente)
          SELECT billing_type
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND billing_type IS NOT NULL
            AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
          
          UNION ALL
          
          -- Recuperador Inteligente: ONE per buyer_email + product
          SELECT MAX(billing_type) as billing_type
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND billing_type IS NOT NULL
            AND billing_type ILIKE '%recuperador%'
          GROUP BY buyer_email, product
        )
        SELECT billing_type, COUNT(*) as cnt
        FROM deduplicated
        WHERE billing_type IS NOT NULL
        GROUP BY billing_type
      ) sub
    ),
    'payment_methods', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', payment_method, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        WITH deduplicated AS (
          SELECT payment_method
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND payment_method IS NOT NULL
            AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
          
          UNION ALL
          
          SELECT MAX(payment_method) as payment_method
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND payment_method IS NOT NULL
            AND billing_type ILIKE '%recuperador%'
          GROUP BY buyer_email, product
        )
        SELECT payment_method, COUNT(*) as cnt
        FROM deduplicated
        WHERE payment_method IS NOT NULL
        GROUP BY payment_method
      ) sub
    ),
    'sck_codes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', sck_code, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        WITH deduplicated AS (
          SELECT sck_code
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND sck_code IS NOT NULL
            AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
          
          UNION ALL
          
          SELECT MAX(sck_code) as sck_code
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND sck_code IS NOT NULL
            AND billing_type ILIKE '%recuperador%'
          GROUP BY buyer_email, product
        )
        SELECT sck_code, COUNT(*) as cnt
        FROM deduplicated
        WHERE sck_code IS NOT NULL
        GROUP BY sck_code
      ) sub
    ),
    'products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('value', product, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        WITH deduplicated AS (
          SELECT product
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND product IS NOT NULL
            AND (billing_type IS NULL OR billing_type NOT ILIKE '%recuperador%')
          
          UNION ALL
          
          SELECT product
          FROM transactions
          WHERE (p_client_id IS NULL OR client_id = p_client_id)
            AND public.user_has_client_access(client_id)
            AND product IS NOT NULL
            AND billing_type ILIKE '%recuperador%'
          GROUP BY buyer_email, product
        )
        SELECT product, COUNT(*) as cnt
        FROM deduplicated
        WHERE product IS NOT NULL
        GROUP BY product
      ) sub
    )
  );
END;
$function$;
