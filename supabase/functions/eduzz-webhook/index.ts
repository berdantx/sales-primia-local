import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EduzzWebhookPayload {
  sale_id?: string | number;
  id?: string | number;
  invoice_code?: string;
  product_name?: string;
  product?: string;
  product_id?: string | number;
  client_name?: string;
  buyer_name?: string;
  client_email?: string;
  buyer_email?: string;
  client_phone?: string;
  buyer_phone?: string;
  sale_amount?: number;
  sale_value?: number;
  value?: number;
  sale_date?: string;
  created_at?: string;
  sale_status?: string;
  status?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookUserId = Deno.env.get("WEBHOOK_USER_ID")!;
  const webhookClientId = Deno.env.get("WEBHOOK_CLIENT_ID");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: EduzzWebhookPayload;

  try {
    const rawBody = await req.text();
    console.log("Eduzz Webhook received:", rawBody.substring(0, 500));

    // Parse the body - handle both array and object formats
    const parsed = JSON.parse(rawBody);
    
    // If n8n sends the payload wrapped in an array or with body property
    if (Array.isArray(parsed)) {
      body = parsed[0]?.body || parsed[0];
    } else if (parsed.body) {
      body = parsed.body;
    } else {
      body = parsed;
    }

    console.log("Parsed Eduzz payload:", JSON.stringify(body).substring(0, 500));
  } catch (parseError) {
    console.error("Failed to parse Eduzz webhook body:", parseError);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const saleId = String(body.sale_id || body.id || "unknown");
  const saleStatus = body.sale_status || body.status || "";
  const eventType = "EDUZZ_SALE_" + (saleStatus.toUpperCase().replace(/\s+/g, "_") || "UNKNOWN");

  console.log(`Processing Eduzz sale ${saleId} with status: ${saleStatus}`);

  // Only process "approved" or "aprovado" sales
  const approvedStatuses = ["approved", "aprovado", "pago", "paid", "completed"];
  const isApproved = approvedStatuses.some(s => saleStatus.toLowerCase().includes(s));

  if (!isApproved) {
    console.log(`Skipping sale ${saleId} - status is not approved: ${saleStatus}`);

    // Log skipped event
    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      event_type: eventType,
      transaction_code: saleId,
      status: "skipped",
      payload: body,
      error_message: `Status "${saleStatus}" não é aprovado`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sale ${saleId} skipped - status is not approved`,
        status: saleStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Map Eduzz fields to eduzz_transactions table
    const transactionData = {
      user_id: webhookUserId,
      client_id: webhookClientId || null,
      sale_id: saleId,
      invoice_code: body.invoice_code || null,
      product: body.product_name || body.product || null,
      product_id: body.product_id ? String(body.product_id) : null,
      buyer_name: body.client_name || body.buyer_name || null,
      buyer_email: body.client_email || body.buyer_email || null,
      buyer_phone: body.client_phone || body.buyer_phone || null,
      sale_value: body.sale_amount || body.sale_value || body.value || 0,
      currency: "BRL",
      sale_date: body.sale_date || body.created_at || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      source: "webhook",
    };

    console.log("Upserting Eduzz transaction:", JSON.stringify(transactionData));

    // Upsert transaction (uses unique constraint on user_id + sale_id)
    const { data: transaction, error: transactionError } = await supabase
      .from("eduzz_transactions")
      .upsert(transactionData, {
        onConflict: "user_id,sale_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Failed to upsert Eduzz transaction:", transactionError);

      // Log error
      await supabase.from("webhook_logs").insert({
        user_id: webhookUserId,
        event_type: eventType,
        transaction_code: saleId,
        status: "error",
        payload: body,
        error_message: transactionError.message,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: transactionError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Eduzz transaction upserted successfully:", transaction?.id);

    // Log success
    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      event_type: eventType,
      transaction_code: saleId,
      status: "processed",
      payload: body,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Eduzz sale ${saleId} processed successfully`,
        transaction_id: transaction?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error processing Eduzz webhook:", error);

    // Log error
    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      event_type: eventType,
      transaction_code: saleId,
      status: "error",
      payload: body,
      error_message: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
