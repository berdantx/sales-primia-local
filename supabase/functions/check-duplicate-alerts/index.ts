import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DUPLICATE_THRESHOLD = 10; // Alert when more than 10 duplicates in a day

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count duplicates from today
    const { data: duplicates, error: queryError } = await supabase
      .from("webhook_logs")
      .select("id, event_type, client_id")
      .eq("status", "duplicate")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    if (queryError) {
      console.error("Error querying duplicates:", queryError);
      throw queryError;
    }

    const duplicateCount = duplicates?.length || 0;
    console.log(`Found ${duplicateCount} duplicates today`);

    if (duplicateCount <= DUPLICATE_THRESHOLD) {
      return new Response(JSON.stringify({
        success: true,
        message: `Duplicate count (${duplicateCount}) is below threshold (${DUPLICATE_THRESHOLD})`,
        alertSent: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by platform for the alert
    const hotmartCount = duplicates?.filter(d => d.event_type.includes('PURCHASE')).length || 0;
    const tmbCount = duplicates?.filter(d => d.event_type.toLowerCase().startsWith('tmb_')).length || 0;
    const eduzzCount = duplicates?.filter(d => d.event_type.toLowerCase().startsWith('eduzz_')).length || 0;

    // Get admin users to send alert
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "master"]);

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to send alert");
      return new Response(JSON.stringify({
        success: true,
        message: "No admin users to notify",
        alertSent: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin emails from auth.users (via profiles or direct query)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", adminRoles.map(r => r.user_id));

    // For now, we'll need to get the email from the webhook user or a configured email
    // Since we can't query auth.users directly, we'll send to a configured email
    const alertEmail = Deno.env.get("ALERT_EMAIL") || "admin@example.com";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">⚠️ Alerta de Duplicatas</h2>
        <p>O número de webhooks duplicados hoje ultrapassou o limite configurado.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 12px 0; color: #374151;">Resumo do Dia</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total de Duplicatas:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #ef4444; font-weight: bold;">${duplicateCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Hotmart:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${hotmartCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">TMB:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${tmbCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Eduzz:</td>
              <td style="padding: 8px 0; text-align: right;">${eduzzCount}</td>
            </tr>
          </table>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Limite configurado: ${DUPLICATE_THRESHOLD} duplicatas/dia
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          Este é um email automático do sistema de monitoramento de webhooks.
        </p>
      </div>
    `;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Alertas <onboarding@resend.dev>",
        to: [alertEmail],
        subject: `⚠️ Alerta: ${duplicateCount} duplicatas detectadas hoje`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send email:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Alert email sent:", emailResult);

    return new Response(JSON.stringify({
      success: true,
      message: `Alert sent for ${duplicateCount} duplicates`,
      alertSent: true,
      duplicateCount,
      breakdown: { hotmart: hotmartCount, tmb: tmbCount, eduzz: eduzzCount },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in check-duplicate-alerts:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
