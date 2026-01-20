import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertPayload {
  clientId: string;
  clientName: string;
  normalizedUrl: string;
  firstLeadId: string;
  firstLeadData: {
    email: string;
    firstName?: string;
    lastName?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    createdAt: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: AlertPayload = await req.json();
    console.log("Received alert payload:", JSON.stringify(payload, null, 2));

    const { clientId, clientName, normalizedUrl, firstLeadData } = payload;

    // Get admin/master users to notify
    const { data: adminUsers, error: usersError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["master", "admin"]);

    if (usersError) {
      console.error("Error fetching admin users:", usersError);
      throw usersError;
    }

    // Get emails of admin users who have access to this client
    const adminEmails: string[] = [];
    for (const adminUser of adminUsers || []) {
      // Check if user has access to this client (masters have access to all)
      if (adminUser.role === "master") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", adminUser.user_id)
          .single();

        if (profile) {
          // Get email from auth.users via service role
          const { data: authData } = await supabase.auth.admin.getUserById(adminUser.user_id);
          if (authData?.user?.email) {
            adminEmails.push(authData.user.email);
          }
        }
      }
    }

    if (adminEmails.length === 0) {
      console.log("No admin emails found, skipping alert");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No admins to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending alert to ${adminEmails.length} admins:`, adminEmails);

    // Format the alert email
    const leadName = [firstLeadData.firstName, firstLeadData.lastName].filter(Boolean).join(" ") || "Não informado";
    const utmInfo = [
      firstLeadData.utmSource && `Source: ${firstLeadData.utmSource}`,
      firstLeadData.utmMedium && `Medium: ${firstLeadData.utmMedium}`,
      firstLeadData.utmCampaign && `Campaign: ${firstLeadData.utmCampaign}`,
      firstLeadData.utmContent && `Content: ${firstLeadData.utmContent}`,
    ].filter(Boolean).join("<br>");

    const detectedAt = new Date(firstLeadData.createdAt).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header .icon { font-size: 48px; margin-bottom: 10px; }
    .content { background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; }
    .url-box { background: white; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 18px; color: #667eea; margin: 15px 0; border-left: 4px solid #667eea; }
    .info-grid { display: grid; gap: 15px; margin: 20px 0; }
    .info-item { background: white; padding: 15px; border-radius: 8px; }
    .info-item .label { font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .info-item .value { font-size: 16px; color: #333; }
    .footer { background: #333; color: white; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">📍</div>
      <h1>Nova Landing Page Detectada!</h1>
    </div>
    <div class="content">
      <p>Uma <strong>nova landing page</strong> começou a receber leads para o cliente <strong>${clientName}</strong>.</p>
      
      <p style="font-size: 14px; color: #6c757d;">Isso pode indicar o início de um novo teste A/B.</p>
      
      <div class="url-box">${normalizedUrl}</div>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Detectada em</div>
          <div class="value">${detectedAt}</div>
        </div>
        
        <div class="info-item">
          <div class="label">Primeiro Lead</div>
          <div class="value">
            <strong>${leadName}</strong><br>
            ${firstLeadData.email}
          </div>
        </div>
        
        ${utmInfo ? `
        <div class="info-item">
          <div class="label">UTM Parameters</div>
          <div class="value">${utmInfo}</div>
        </div>
        ` : ""}
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0; opacity: 0.8;">Este alerta foi gerado automaticamente pelo sistema de monitoramento de landing pages.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "Lovable <onboarding@resend.dev>",
      to: adminEmails,
      subject: `📍 Nova Landing Page: ${normalizedUrl} - ${clientName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Mark the known landing page as alert_sent
    await supabase
      .from("known_landing_pages")
      .update({ alert_sent: true })
      .eq("client_id", clientId)
      .eq("normalized_url", normalizedUrl);

    return new Response(
      JSON.stringify({ success: true, emailsSent: adminEmails.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in new-landing-page-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
