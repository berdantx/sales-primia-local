import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  clientId?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Sales Analytics <noreply@sales.primia.ai>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await res.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is master
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "master") {
      return new Response(
        JSON.stringify({ error: "Apenas masters podem enviar convites" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, clientId }: InvitationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already has pending invitation
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID();
    
    // Create invitation using service role client for insert
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("invitations")
      .insert({
        email: email.toLowerCase(),
        invited_by: user.id,
        token,
        status: "pending",
        role: "user",
        client_id: clientId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting invitation:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get client name if clientId is provided
    let clientName = "";
    if (clientId) {
      const { data: clientData } = await supabaseAdmin
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();
      
      if (clientData) {
        clientName = clientData.name;
      }
    }

    // Get the app URL from request origin or use default
    const origin = req.headers.get("origin") || "https://vvuhqqvjtozhwideqdnn.lovableproject.com";
    const inviteLink = `${origin}/invite/${token}`;

    // Send email
    const clientInfo = clientName ? `<p style="color: #6B7280; text-align: center; margin-bottom: 10px;">Você terá acesso à conta: <strong>${clientName}</strong></p>` : '';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #0066FF, #00B37E); width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
          </div>
        </div>
        
        <h1 style="color: #0F1724; text-align: center; margin-bottom: 20px;">
          Você foi convidado! 🎉
        </h1>
        
        <p style="color: #6B7280; text-align: center; margin-bottom: 10px;">
          Você recebeu um convite para acessar o <strong>Sales Analytics</strong>, 
          uma plataforma de análise de vendas.
        </p>
        
        ${clientInfo}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="display: inline-block; background: #0066FF; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
            Aceitar Convite
          </a>
        </div>
        
        <p style="color: #9CA3AF; font-size: 14px; text-align: center;">
          Este convite expira em 7 dias. Se você não solicitou este convite, ignore este email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
        
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          Se o botão não funcionar, copie e cole este link no navegador:<br>
          <a href="${inviteLink}" style="color: #0066FF;">${inviteLink}</a>
        </p>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(
      email,
      "Você foi convidado para o Sales Analytics!",
      emailHtml
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite enviado com sucesso",
        invitation_id: invitation.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
