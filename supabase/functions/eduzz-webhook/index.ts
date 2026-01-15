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
  // Ping/validation fields
  event?: string;
  type?: string;
  action?: string;
  message?: string;
  // New format with nested data
  data?: {
    id?: string | number;
    status?: string;
    value?: number;
    currency?: string;
    created_at?: string;
    buyer?: {
      name?: string;
      email?: string;
      cellphone?: string;
      phone?: string;
    };
    product?: {
      id?: string | number;
      name?: string;
    };
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    message?: string;
  };
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
  const defaultClientId = Deno.env.get("WEBHOOK_CLIENT_ID");

  // Get client_id from query parameter (priority) or fall back to env var
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get('client_id');
  const webhookClientId = clientIdParam || defaultClientId;

  console.log(`Eduzz webhook - client_id from URL: ${clientIdParam}, using: ${webhookClientId}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate client_id if provided
  if (webhookClientId) {
    const { data: clientExists } = await supabase
      .from('clients')
      .select('id')
      .eq('id', webhookClientId)
      .single();
    
    if (!clientExists) {
      console.error(`Client not found: ${webhookClientId}`);
      return new Response(JSON.stringify({ 
        error: 'Invalid client_id',
        message: `Client ${webhookClientId} not found`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let body: EduzzWebhookPayload;
  let rawBody: string;

  try {
    rawBody = await req.text();
    console.log("Eduzz Webhook received:", rawBody.substring(0, 1000));

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

    console.log("Parsed Eduzz payload:", JSON.stringify(body).substring(0, 1000));
  } catch (parseError) {
    console.error("Failed to parse Eduzz webhook body:", parseError);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check for ping/validation requests
  const isPingRequest = 
    body.event === 'ping' || 
    body.type === 'ping' ||
    body.action === 'ping' ||
    body.message === 'ping' ||
    (body.data?.message === 'ping');
  
  if (isPingRequest) {
    console.log('Ping/validation request detected, responding with 200');
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Eduzz webhook endpoint is active',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Support both new format (data object) and old format (flat)
  const eduzzData = body.data ?? body;
  const buyer = body.data?.buyer ?? {};
  const productData = body.data?.product;

  const saleId = String(body.id || body.data?.id || body.sale_id || "unknown");
  const saleStatus = body.data?.status || body.sale_status || body.status || "";
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
    // Map Eduzz fields to eduzz_transactions table - support both formats
    const transactionData = {
      user_id: webhookUserId,
      client_id: webhookClientId || null,
      sale_id: saleId,
      invoice_code: body.invoice_code || null,
      product: productData?.name || body.product_name || body.product || null,
      product_id: productData?.id ? String(productData.id) : (body.product_id ? String(body.product_id) : null),
      buyer_name: buyer.name || body.client_name || body.buyer_name || null,
      buyer_email: buyer.email || body.client_email || body.buyer_email || null,
      buyer_phone: buyer.cellphone || buyer.phone || body.client_phone || body.buyer_phone || null,
      sale_value: body.data?.value || body.sale_amount || body.sale_value || body.value || 0,
      currency: body.data?.currency || "BRL",
      sale_date: body.data?.created_at || body.sale_date || body.created_at || new Date().toISOString(),
      utm_source: body.data?.utm_source || body.utm_source || null,
      utm_medium: body.data?.utm_medium || body.utm_medium || null,
      utm_campaign: body.data?.utm_campaign || body.utm_campaign || null,
      utm_content: body.data?.utm_content || body.utm_content || null,
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
