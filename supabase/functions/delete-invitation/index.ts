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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "master") {
      return new Response(
        JSON.stringify({ error: "Apenas masters podem excluir convites" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { invitationId }: DeleteRequest = await req.json();

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: "ID do convite é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check invitation exists and status
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("invitations")
      .select("id, status")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (invitation.status === "accepted") {
      return new Response(
        JSON.stringify({ error: "Não é possível excluir um convite já aceito" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete invitation
    const { error: deleteError } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("id", invitationId);

    if (deleteError) {
      console.error("Error deleting invitation:", deleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir convite" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
    console.error("Error in delete-invitation function:", error);
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
