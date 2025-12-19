import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password, fullName } = await req.json();

    if (!token || !password || !fullName) {
      console.error('Missing required fields:', { token: !!token, password: !!password, fullName: !!fullName });
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

    console.log('Looking for invitation with token:', token);

    // 1. Fetch invitation by token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation not found:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found invitation:', { id: invitation.id, email: invitation.email, status: invitation.status, client_id: invitation.client_id });

    // 2. Validate invitation status
    if (invitation.status === 'accepted') {
      console.error('Invitation already accepted');
      return new Response(
        JSON.stringify({ error: 'Este convite já foi utilizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate expiration
    if (new Date(invitation.expires_at) < new Date()) {
      console.error('Invitation expired:', invitation.expires_at);
      return new Response(
        JSON.stringify({ error: 'Este convite expirou' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;
    } else {
      // 5. Create user with admin API (auto-confirmed)
      console.log('Creating new user for email:', invitation.email);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: createError.message || 'Erro ao criar usuário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!newUser.user) {
        console.error('User not created');
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('User created successfully:', userId);
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
        console.log('Associating user with client:', { userId, clientId: invitation.client_id });
        const { error: clientUserError } = await supabaseAdmin
          .from('client_users')
          .insert({
            user_id: userId,
            client_id: invitation.client_id,
            is_owner: false,
          });

        if (clientUserError) {
          console.error('Error associating user to client:', clientUserError);
          // Don't fail the whole flow, but log it
        } else {
          console.log('User associated with client successfully');
        }
      } else {
        console.log('User already associated with client');
      }
    } else {
      console.log('No client_id in invitation, skipping association');
    }

    // 7. Update invitation status
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString() 
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation status:', updateError);
      // Don't fail, user was created successfully
    } else {
      console.log('Invitation marked as accepted');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta criada com sucesso!',
        userId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
