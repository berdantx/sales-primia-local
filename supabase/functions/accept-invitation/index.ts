import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("[ACCEPT-INVITATION] === Iniciando aceitação ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password, fullName } = await req.json();
    console.log("[ACCEPT-INVITATION] Token recebido:", token?.substring(0, 8) + "...");
    console.log("[ACCEPT-INVITATION] Nome:", fullName);

    if (!token || !password || !fullName) {
      console.error('[ACCEPT-INVITATION] ✗ Campos obrigatórios ausentes:', { token: !!token, password: !!password, fullName: !!fullName });
      return new Response(
        JSON.stringify({ error: 'Token, senha e nome são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('[ACCEPT-INVITATION] Buscando convite...');

    // 1. Fetch invitation by token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      console.error('[ACCEPT-INVITATION] ✗ Convite não encontrado:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ACCEPT-INVITATION] ✓ Convite encontrado:', { id: invitation.id, email: invitation.email, status: invitation.status, client_id: invitation.client_id });

    // 2. Validate invitation status
    if (invitation.status === 'accepted') {
      console.error('[ACCEPT-INVITATION] ✗ Convite já foi aceito');
      return new Response(
        JSON.stringify({ error: 'Este convite já foi utilizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate expiration
    if (new Date(invitation.expires_at) < new Date()) {
      console.error('[ACCEPT-INVITATION] ✗ Convite expirado:', invitation.expires_at);
      return new Response(
        JSON.stringify({ error: 'Este convite expirou' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check if user already exists
    console.log('[ACCEPT-INVITATION] Verificando se usuário já existe...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      console.log('[ACCEPT-INVITATION] ✓ Usuário já existe:', existingUser.id);
      userId = existingUser.id;
    } else {
      // 5. Create user with admin API (auto-confirmed)
      console.log('[ACCEPT-INVITATION] Criando novo usuário para:', invitation.email);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError) {
        console.error('[ACCEPT-INVITATION] ✗ Erro ao criar usuário:', createError);
        return new Response(
          JSON.stringify({ error: createError.message || 'Erro ao criar usuário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!newUser.user) {
        console.error('[ACCEPT-INVITATION] ✗ Usuário não foi criado');
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('[ACCEPT-INVITATION] ✓ Usuário criado com sucesso:', userId);
    }

    // 6. Associate user with client (if client_id exists)
    if (invitation.client_id) {
      // Check if association already exists
      const { data: existingAssociation } = await supabaseAdmin
        .from('client_users')
        .select('id')
        .eq('user_id', userId)
        .eq('client_id', invitation.client_id)
        .single();

      if (!existingAssociation) {
        console.log('[ACCEPT-INVITATION] Associando usuário ao cliente:', { userId, clientId: invitation.client_id });
        const { error: clientUserError } = await supabaseAdmin
          .from('client_users')
          .insert({
            user_id: userId,
            client_id: invitation.client_id,
            is_owner: false,
          });

        if (clientUserError) {
          console.error('[ACCEPT-INVITATION] ⚠ Erro ao associar usuário ao cliente:', clientUserError);
          // Don't fail the whole flow, but log it
        } else {
          console.log('[ACCEPT-INVITATION] ✓ Usuário associado ao cliente com sucesso');
        }
      } else {
        console.log('[ACCEPT-INVITATION] ✓ Usuário já associado ao cliente');
      }
    } else {
      console.log('[ACCEPT-INVITATION] Sem client_id no convite, pulando associação');
    }

    // 7. Update invitation status
    console.log('[ACCEPT-INVITATION] Atualizando status do convite...');
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString() 
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('[ACCEPT-INVITATION] ⚠ Erro ao atualizar status do convite:', updateError);
      // Don't fail, user was created successfully
    } else {
      console.log('[ACCEPT-INVITATION] ✓ Convite marcado como aceito');
    }

    // 8. Register history
    console.log('[ACCEPT-INVITATION] Registrando histórico...');
    const { error: historyError } = await supabaseAdmin
      .from('invitation_history')
      .insert({
        invitation_id: invitation.id,
        action: 'accepted',
        performed_by: userId,
        notes: `Convite aceito. Usuário ${existingUser ? 'já existia' : 'criado'}: ${invitation.email}`,
      });

    if (historyError) {
      console.warn('[ACCEPT-INVITATION] ⚠ Erro ao registrar histórico:', historyError);
    } else {
      console.log('[ACCEPT-INVITATION] ✓ Histórico registrado');
    }

    console.log('[ACCEPT-INVITATION] === Aceitação concluída com sucesso ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta criada com sucesso!',
        userId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ACCEPT-INVITATION] ✗ Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
