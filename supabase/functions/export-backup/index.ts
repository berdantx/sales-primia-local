import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables available for backup
const AVAILABLE_TABLES = [
  'transactions',
  'eduzz_transactions',
  'tmb_transactions',
  'clients',
  'profiles',
  'leads',
  'goals',
  'goal_history',
  'invitations',
  'invitation_history',
  'user_roles',
  'client_users',
  'filter_views',
  'imports',
  'import_errors',
  'webhook_logs',
  'webhook_dispatch_logs',
  'external_webhooks',
  'access_logs',
  'app_settings',
  'llm_integrations',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for full access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to verify auth
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or master
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      console.error('Role error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Usuário sem permissão' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['master', 'admin', 'super_admin'];
    if (!allowedRoles.includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem gerar backups' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const requestedTables = body.tables || AVAILABLE_TABLES;
    const includeMetadata = body.includeMetadata !== false;

    console.log(`User ${user.email} requesting backup for tables:`, requestedTables);

    // Validate requested tables
    const validTables = requestedTables.filter((t: string) => AVAILABLE_TABLES.includes(t));
    
    if (validTables.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma tabela válida selecionada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect data from each table
    const backupData: Record<string, any> = {};
    const tableStats: Record<string, number> = {};
    let totalRecords = 0;

    for (const tableName of validTables) {
      console.log(`Exporting table: ${tableName}`);
      
      // Use pagination to handle large tables
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error(`Error exporting ${tableName}:`, error);
          backupData[tableName] = { error: error.message };
          break;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      backupData[tableName] = allData;
      tableStats[tableName] = allData.length;
      totalRecords += allData.length;
      
      console.log(`Table ${tableName}: ${allData.length} records`);
    }

    // Build response
    const response = {
      backup_info: includeMetadata ? {
        created_at: new Date().toISOString(),
        created_by: user.email,
        project: 'AnalyzeFlow',
        tables_included: validTables,
        table_stats: tableStats,
        total_records: totalRecords,
        version: '1.0',
      } : undefined,
      data: backupData,
    };

    // Log backup action
    try {
      await supabaseAdmin.from('access_logs').insert({
        user_id: user.id,
        action: 'backup_generated',
        resource_type: 'database',
        resource_id: null,
        details: {
          tables: validTables,
          total_records: totalRecords,
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
    } catch (logError) {
      console.error('Error logging backup action:', logError);
    }

    console.log(`Backup complete: ${totalRecords} records from ${validTables.length} tables`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error) {
    console.error('Error generating backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar backup', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
