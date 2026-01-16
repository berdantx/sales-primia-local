import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteRequest {
  invitationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[DELETE-INVITATION] === Iniciando exclusão ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[DELETE-INVITATION] ✗ Authorization header ausente");
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

    console.log("[DELETE-INVITATION] Verificando autenticação...");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[DELETE-INVITATION] ✗ Usuário não autenticado:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[DELETE-INVITATION] ✓ Usuário autenticado:", user.email);

    console.log("[DELETE-INVITATION] Verificando permissão (role)...");
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "master") {
      console.error("[DELETE-INVITATION] ✗ Usuário não é master. Role:", roleData?.role);
      return new Response(
        JSON.stringify({ error: "Apenas masters podem excluir convites" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[DELETE-INVITATION] ✓ Role verificada: master");

    const { invitationId }: DeleteRequest = await req.json();
    console.log("[DELETE-INVITATION] Invitation ID:", invitationId);

    if (!invitationId) {
      console.error("[DELETE-INVITATION] ✗ ID do convite não fornecido");
      return new Response(
        JSON.stringify({ error: "ID do convite é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check invitation exists and status
    console.log("[DELETE-INVITATION] Buscando convite...");
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("invitations")
      .select("id, status, email")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      console.error("[DELETE-INVITATION] ✗ Convite não encontrado:", fetchError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[DELETE-INVITATION] ✓ Convite encontrado:", invitation.email);
    console.log("[DELETE-INVITATION] Status:", invitation.status);

    if (invitation.status === "accepted") {
      console.error("[DELETE-INVITATION] ✗ Convite já foi aceito");
      return new Response(
        JSON.stringify({ error: "Não é possível excluir um convite já aceito" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Register history before deletion (will be cascade deleted, but we log it first)
    console.log("[DELETE-INVITATION] Registrando histórico...");
    const { error: historyError } = await supabaseAdmin
      .from("invitation_history")
      .insert({
        invitation_id: invitationId,
        action: "deleted",
        performed_by: user.id,
        notes: `Convite excluído manualmente. Email: ${invitation.email}`,
      });

    if (historyError) {
      console.warn("[DELETE-INVITATION] ⚠ Erro ao registrar histórico:", historyError);
    } else {
      console.log("[DELETE-INVITATION] ✓ Histórico registrado");
    }

    // Delete invitation
    console.log("[DELETE-INVITATION] Excluindo convite...");
    const { error: deleteError } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("id", invitationId);

    if (deleteError) {
      console.error("[DELETE-INVITATION] ✗ Erro ao excluir convite:", deleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir convite" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("[DELETE-INVITATION] ✓ Convite excluído com sucesso");

    console.log("[DELETE-INVITATION] === Exclusão concluída com sucesso ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite excluído com sucesso" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[DELETE-INVITATION] ✗ Erro inesperado:", error);
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
