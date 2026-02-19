import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is master
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (callerRole?.role !== 'master') {
      return new Response(
        JSON.stringify({ error: 'Only masters can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (target_user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user info before deletion
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
    const targetEmail = targetUser?.user?.email || 'unknown';

    // Delete related data in order (to avoid FK issues)
    // 1. client_users
    await supabaseAdmin.from('client_users').delete().eq('user_id', target_user_id);
    // 2. user_roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', target_user_id);
    // 3. profiles
    await supabaseAdmin.from('profiles').delete().eq('user_id', target_user_id);
    // 4. filter_views
    await supabaseAdmin.from('filter_views').delete().eq('user_id', target_user_id);
    // 5. goal_history
    await supabaseAdmin.from('goal_history').delete().eq('user_id', target_user_id);
    // 6. goals
    await supabaseAdmin.from('goals').delete().eq('user_id', target_user_id);
    // 7. llm_integrations
    await supabaseAdmin.from('llm_integrations').delete().eq('user_id', target_user_id);
    // 8. export_jobs
    await supabaseAdmin.from('export_jobs').delete().eq('user_id', target_user_id);

    // Delete auth user (cascades remaining references)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from auth' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the deletion
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    await supabaseAdmin.from('access_logs').insert({
      user_id: caller.id,
      email: caller.email,
      event_type: 'user_deleted',
      ip_address,
      user_agent,
      metadata: {
        deleted_user_id: target_user_id,
        deleted_user_email: targetEmail,
      },
    });

    console.log(`User ${targetEmail} (${target_user_id}) deleted by ${caller.email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Usuário ${targetEmail} foi excluído com sucesso` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
