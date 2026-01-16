import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendRequest {
  invitationId: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  console.log("[RESEND-INVITATION] Enviando email via Resend...");
  console.log("[RESEND-INVITATION] Destinatário:", to);
  
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
    console.error("[RESEND-INVITATION] ✗ Erro ao enviar email:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  const result = await res.json();
  console.log("[RESEND-INVITATION] ✓ Email enviado com sucesso. ID:", result.id);
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[RESEND-INVITATION] === Iniciando reenvio ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[RESEND-INVITATION] ✗ Authorization header ausente");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    console.log("[RESEND-INVITATION] Verificando autenticação...");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[RESEND-INVITATION] ✗ Usuário não autenticado:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[RESEND-INVITATION] ✓ Usuário autenticado:", user.email);

    console.log("[RESEND-INVITATION] Verificando permissão (role)...");
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "master") {
      console.error("[RESEND-INVITATION] ✗ Usuário não é master. Role:", roleData?.role);
      return new Response(
        JSON.stringify({ error: "Apenas masters podem reenviar convites" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[RESEND-INVITATION] ✓ Role verificada: master");

    const { invitationId }: ResendRequest = await req.json();
    console.log("[RESEND-INVITATION] Invitation ID:", invitationId);

    if (!invitationId) {
      console.error("[RESEND-INVITATION] ✗ ID do convite não fornecido");
      return new Response(
        JSON.stringify({ error: "ID do convite é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get current invitation
    console.log("[RESEND-INVITATION] Buscando convite...");
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("invitations")
      .select("*, clients(name)")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      console.error("[RESEND-INVITATION] ✗ Convite não encontrado:", fetchError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[RESEND-INVITATION] ✓ Convite encontrado:", invitation.email);
    console.log("[RESEND-INVITATION] Status atual:", invitation.status);
    console.log("[RESEND-INVITATION] Token antigo:", invitation.token?.substring(0, 8) + "...");

    if (invitation.status === "accepted") {
      console.error("[RESEND-INVITATION] ✗ Convite já foi aceito");
      return new Response(
        JSON.stringify({ error: "Não é possível reenviar um convite já aceito" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate new token and update expiration
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    console.log("[RESEND-INVITATION] Novo token gerado:", newToken.substring(0, 8) + "...");
    console.log("[RESEND-INVITATION] Nova data de expiração:", expiresAt.toISOString());

    console.log("[RESEND-INVITATION] Atualizando convite no banco...");
    const { error: updateError } = await supabaseAdmin
      .from("invitations")
      .update({
        token: newToken,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("[RESEND-INVITATION] ✗ Erro ao atualizar convite:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar convite" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[RESEND-INVITATION] ✓ Banco atualizado com sucesso");

    // Register history
    console.log("[RESEND-INVITATION] Registrando histórico...");
    const { error: historyError } = await supabaseAdmin
      .from("invitation_history")
      .insert({
        invitation_id: invitationId,
        action: "resent",
        performed_by: user.id,
        old_token: invitation.token,
        new_token: newToken,
        old_expires_at: invitation.expires_at,
        new_expires_at: expiresAt.toISOString(),
        email_sent: true,
        notes: `Convite reenviado para ${invitation.email}`,
      });

    if (historyError) {
      console.warn("[RESEND-INVITATION] ⚠ Erro ao registrar histórico:", historyError);
    } else {
      console.log("[RESEND-INVITATION] ✓ Histórico registrado");
    }

    // Send email
    const origin = req.headers.get("origin") || "https://vvuhqqvjtozhwideqdnn.lovableproject.com";
    const inviteLink = `${origin}/invite/${newToken}`;
    console.log("[RESEND-INVITATION] Link do convite:", inviteLink);

    const clientName = invitation.clients?.name || "";
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
          Convite Reenviado! 🎉
        </h1>
        
        <p style="color: #6B7280; text-align: center; margin-bottom: 10px;">
          Você recebeu novamente um convite para acessar o <strong>Sales Analytics</strong>, 
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

    await sendEmail(
      invitation.email,
      "Convite reenviado - Sales Analytics",
      emailHtml
    );

    console.log("[RESEND-INVITATION] === Reenvio concluído com sucesso ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite reenviado com sucesso" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[RESEND-INVITATION] ✗ Erro inesperado:", error);
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
