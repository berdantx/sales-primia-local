
CREATE OR REPLACE FUNCTION public.get_database_schema()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'exported_at', now(),
    'tables', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT 
          tbl.table_name AS name,
          (
            SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
            FROM (
              SELECT 
                col.column_name AS name,
                col.udt_name AS type,
                col.is_nullable = 'YES' AS nullable,
                col.column_default AS "default",
                col.character_maximum_length AS max_length,
                col.numeric_precision
              FROM information_schema.columns col
              WHERE col.table_schema = 'public' AND col.table_name = tbl.table_name
              ORDER BY col.ordinal_position
            ) c
          ) AS columns
        FROM information_schema.tables tbl
        WHERE tbl.table_schema = 'public' AND tbl.table_type = 'BASE TABLE'
        ORDER BY tbl.table_name
      ) t
    ),
    'indexes', (
      SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json)
      FROM (
        SELECT schemaname, tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      ) i
    ),
    'rls_policies', (
      SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json)
      FROM (
        SELECT 
          pol.polname AS policy_name,
          cls.relname AS table_name,
          CASE pol.polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
          END AS command,
          CASE pol.polpermissive
            WHEN true THEN 'PERMISSIVE'
            ELSE 'RESTRICTIVE'
          END AS permissive,
          pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
          pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
        WHERE nsp.nspname = 'public'
        ORDER BY cls.relname, pol.polname
      ) p
    ),
    'rls_enabled', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname
      ) r
    ),
    'functions', (
      SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json)
      FROM (
        SELECT 
          p.proname AS function_name,
          pg_get_function_arguments(p.oid) AS arguments,
          pg_get_functiondef(p.oid) AS definition,
          l.lanname AS language,
          CASE p.provolatile
            WHEN 'i' THEN 'IMMUTABLE'
            WHEN 's' THEN 'STABLE'
            WHEN 'v' THEN 'VOLATILE'
          END AS volatility,
          p.prosecdef AS security_definer
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_language l ON p.prolang = l.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname
      ) f
    ),
    'triggers', (
      SELECT COALESCE(json_agg(row_to_json(tr)), '[]'::json)
      FROM (
        SELECT 
          trigger_name,
          event_manipulation,
          event_object_table,
          action_timing,
          action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      ) tr
    ),
    'foreign_keys', (
      SELECT COALESCE(json_agg(row_to_json(fk)), '[]'::json)
      FROM (
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name
      ) fk
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
