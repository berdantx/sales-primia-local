import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ForceLogoutRequest {
  target_user_id: string;
}

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

    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (roleError || callerRole?.role !== 'master') {
      return new Response(
        JSON.stringify({ error: 'Only masters can force logout users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { target_user_id }: ForceLogoutRequest = await req.json();

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user info for logging
    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
    
    if (targetUserError || !targetUser?.user) {
      console.error('Target user not found:', target_user_id, targetUserError);
      return new Response(
        JSON.stringify({ error: 'Target user not found in auth system' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetEmail = targetUser.user.email || 'unknown';

    // Force logout by updating the user's session - this invalidates all refresh tokens
    // We do this by updating a user attribute which forces token refresh
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
      app_metadata: { 
        force_logout_at: new Date().toISOString() 
      },
    });

    if (updateError) {
      console.error('Error updating user for force logout:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to force logout user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP and user agent for logging
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Log the forced logout event
    await supabaseAdmin
      .from('access_logs')
      .insert({
        user_id: target_user_id,
        email: targetEmail,
        event_type: 'session_revoked',
        ip_address,
        user_agent,
        metadata: {
          revoked_by: caller.id,
          revoked_by_email: caller.email,
        },
      });

    console.log(`User ${targetEmail} (${target_user_id}) was force logged out by ${caller.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Usuário ${targetEmail} foi desconectado com sucesso` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in force-logout function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
