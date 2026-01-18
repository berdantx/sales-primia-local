import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables available for restore (ordered by dependency - independent tables first)
const RESTORE_ORDER = [
  'clients',
  'profiles',
  'user_roles',
  'client_users',
  'app_settings',
  'llm_integrations',
  'goals',
  'goal_history',
  'invitations',
  'invitation_history',
  'filter_views',
  'external_webhooks',
  'imports',
  'import_errors',
  'transactions',
  'eduzz_transactions',
  'tmb_transactions',
  'leads',
  'webhook_logs',
  'webhook_dispatch_logs',
  'access_logs',
];

// Primary keys for each table
const TABLE_PRIMARY_KEYS: Record<string, string> = {
  transactions: 'id',
  eduzz_transactions: 'id',
  tmb_transactions: 'id',
  clients: 'id',
  profiles: 'id',
  leads: 'id',
  goals: 'id',
  goal_history: 'id',
  invitations: 'id',
  invitation_history: 'id',
  user_roles: 'id',
  client_users: 'id',
  filter_views: 'id',
  imports: 'id',
  import_errors: 'id',
  webhook_logs: 'id',
  webhook_dispatch_logs: 'id',
  external_webhooks: 'id',
  access_logs: 'id',
  app_settings: 'id',
  llm_integrations: 'id',
};

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
        JSON.stringify({ error: 'Apenas administradores podem restaurar backups' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { backup_data, tables, mode } = body;

    if (!backup_data || !backup_data.data) {
      return new Response(
        JSON.stringify({ error: 'Dados de backup inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validModes = ['merge', 'replace', 'full'];
    if (!mode || !validModes.includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Modo de restauração inválido. Use: merge, replace, ou full' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tablesToRestore = tables || Object.keys(backup_data.data);
    const validTables = tablesToRestore.filter((t: string) => RESTORE_ORDER.includes(t));

    if (validTables.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma tabela válida para restaurar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort tables by restore order (respect dependencies)
    validTables.sort((a: string, b: string) => 
      RESTORE_ORDER.indexOf(a) - RESTORE_ORDER.indexOf(b)
    );

    console.log(`User ${user.email} restoring ${validTables.length} tables in ${mode} mode`);

    // Process restoration
    const results: Record<string, { inserted: number; updated: number; skipped: number; deleted: number; errors: string[] }> = {};
    let totalProcessed = 0;
    const allErrors: string[] = [];

    for (const tableName of validTables) {
      const tableData = backup_data.data[tableName];
      
      if (!Array.isArray(tableData)) {
        results[tableName] = { inserted: 0, updated: 0, skipped: 0, deleted: 0, errors: ['Dados inválidos para esta tabela'] };
        continue;
      }

      console.log(`Processing table: ${tableName} (${tableData.length} records, mode: ${mode})`);

      const primaryKey = TABLE_PRIMARY_KEYS[tableName] || 'id';
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let deleted = 0;
      const errors: string[] = [];

      try {
        // For FULL mode, delete existing data first
        if (mode === 'full') {
          const { error: deleteError } = await supabaseAdmin
            .from(tableName)
            .delete()
            .neq(primaryKey, '00000000-0000-0000-0000-000000000000'); // Delete all (workaround)

          if (deleteError) {
            console.error(`Error deleting ${tableName}:`, deleteError);
            errors.push(`Erro ao limpar tabela: ${deleteError.message}`);
          } else {
            deleted = -1; // Mark as cleared (we don't know exact count)
            console.log(`Table ${tableName} cleared`);
          }
        }

        // Process records in batches
        const batchSize = 100;
        for (let i = 0; i < tableData.length; i += batchSize) {
          const batch = tableData.slice(i, i + batchSize);

          for (const record of batch) {
            try {
              if (mode === 'full') {
                // Just insert (table was cleared)
                const { error: insertError } = await supabaseAdmin
                  .from(tableName)
                  .insert(record);

                if (insertError) {
                  if (insertError.code === '23505') {
                    // Duplicate key - skip
                    skipped++;
                  } else {
                    errors.push(`Insert error: ${insertError.message}`);
                  }
                } else {
                  inserted++;
                }
              } else if (mode === 'merge') {
                // Check if record exists
                const { data: existing } = await supabaseAdmin
                  .from(tableName)
                  .select(primaryKey)
                  .eq(primaryKey, record[primaryKey])
                  .single();

                if (existing) {
                  // Skip existing records
                  skipped++;
                } else {
                  // Insert new record
                  const { error: insertError } = await supabaseAdmin
                    .from(tableName)
                    .insert(record);

                  if (insertError) {
                    errors.push(`Insert error for ${record[primaryKey]}: ${insertError.message}`);
                  } else {
                    inserted++;
                  }
                }
              } else if (mode === 'replace') {
                // Upsert - insert or update
                const { error: upsertError } = await supabaseAdmin
                  .from(tableName)
                  .upsert(record, { onConflict: primaryKey });

                if (upsertError) {
                  errors.push(`Upsert error for ${record[primaryKey]}: ${upsertError.message}`);
                } else {
                  // We don't know if it was insert or update without extra query
                  updated++;
                }
              }
            } catch (recordError) {
              errors.push(`Error processing record: ${recordError instanceof Error ? recordError.message : 'Unknown'}`);
            }
          }
        }

        totalProcessed += inserted + updated;
      } catch (tableError) {
        console.error(`Error processing table ${tableName}:`, tableError);
        errors.push(`Erro geral: ${tableError instanceof Error ? tableError.message : 'Unknown'}`);
      }

      results[tableName] = { inserted, updated, skipped, deleted, errors };
      
      if (errors.length > 0) {
        allErrors.push(...errors.map(e => `${tableName}: ${e}`));
      }

      console.log(`Table ${tableName} complete: inserted=${inserted}, updated=${updated}, skipped=${skipped}`);
    }

    // Log restore action
    try {
      await supabaseAdmin.from('access_logs').insert({
        user_id: user.id,
        event_type: 'backup_restored',
        metadata: {
          mode,
          tables: validTables,
          total_processed: totalProcessed,
          backup_date: backup_data.backup_info?.created_at || 'unknown',
          errors_count: allErrors.length,
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });
    } catch (logError) {
      console.error('Error logging restore action:', logError);
    }

    console.log(`Restore complete: ${totalProcessed} records processed from ${validTables.length} tables`);

    return new Response(
      JSON.stringify({
        success: allErrors.length === 0,
        mode,
        tables_restored: validTables,
        total_processed: totalProcessed,
        results,
        errors: allErrors.slice(0, 50), // Limit errors returned
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error) {
    console.error('Error restoring backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro ao restaurar backup', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
