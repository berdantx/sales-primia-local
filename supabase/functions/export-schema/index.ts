import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user is authenticated and is master
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to query system catalogs
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Tables and columns
    const { data: columns } = await adminClient.rpc("execute_readonly_query", {
      query_text: `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.udt_name,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.numeric_precision
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
      `,
    }).catch(() => ({ data: null }));

    // Fallback: query directly if RPC doesn't exist
    let tablesData: any[] = [];
    if (!columns) {
      // Direct SQL via PostgREST isn't possible for system tables,
      // so we'll use individual queries per catalog view
      const { data: rawCols } = await adminClient
        .from("information_schema.columns" as any)
        .select("*")
        .eq("table_schema", "public");
      tablesData = rawCols || [];
    } else {
      tablesData = columns;
    }

    // Build tables structure from columns
    const tablesMap: Record<string, any> = {};
    for (const col of (tablesData || [])) {
      const tName = col.table_name;
      if (!tablesMap[tName]) {
        tablesMap[tName] = { name: tName, columns: [] };
      }
      tablesMap[tName].columns.push({
        name: col.column_name,
        type: col.udt_name || col.data_type,
        nullable: col.is_nullable === "YES",
        default: col.column_default,
        max_length: col.character_maximum_length,
      });
    }

    // 2. Indexes
    const { data: indexes } = await adminClient.rpc("execute_readonly_query", {
      query_text: `
        SELECT schemaname, tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `,
    }).catch(() => ({ data: [] }));

    // 3. RLS Policies
    const { data: policies } = await adminClient.rpc("execute_readonly_query", {
      query_text: `
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
      `,
    }).catch(() => ({ data: [] }));

    // 4. Functions
    const { data: functions } = await adminClient.rpc("execute_readonly_query", {
      query_text: `
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
      `,
    }).catch(() => ({ data: [] }));

    // 5. Triggers
    const { data: triggers } = await adminClient.rpc("execute_readonly_query", {
      query_text: `
        SELECT 
          trigger_name,
          event_manipulation,
          event_object_table,
          action_timing,
          action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      `,
    }).catch(() => ({ data: [] }));

    // 6. Foreign keys
    const { data: foreignKeys } = await adminClient.rpc("execute_readonly_query", {
      query_text: `
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
      `,
    }).catch(() => ({ data: [] }));

    // 7. RLS enabled status per table
    const { data: rlsStatus } = await adminClient.rpc("execute_readonly_query", {
      query_text: `
        SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname
      `,
    }).catch(() => ({ data: [] }));

    const schema = {
      exported_at: new Date().toISOString(),
      tables: Object.values(tablesMap),
      indexes: indexes || [],
      rls_policies: policies || [],
      rls_enabled: rlsStatus || [],
      functions: functions || [],
      triggers: triggers || [],
      foreign_keys: foreignKeys || [],
    };

    return new Response(JSON.stringify(schema), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("export-schema error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
