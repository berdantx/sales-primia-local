import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TmbWebhookPayload {
  pedido?: number;
  id?: number;
  status_pedido?: string;
  lancamento?: string;
  cliente?: string;
  email?: string;
  telefone?: string;
  phone?: string;
  celular?: string;
  valor_total?: number;
  data_efetivado?: string;
  criado_em?: string;
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
  const defaultClientId = Deno.env.get("WEBHOOK_CLIENT_ID");

  // Get client_id from query parameter (priority) or fall back to env var
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get('client_id');
  const webhookClientId = clientIdParam || defaultClientId;

  console.log(`TMB webhook - client_id from URL: ${clientIdParam}, using: ${webhookClientId}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Producer-to-client routing rules
  const PRODUCER_CLIENT_MAP: Record<string, string> = {
    "Camila Vieira 2": "b48b649d-1b1b-451d-8eb5-1d8cd38f422c", // Camila Vieira - 2026
  };

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

  let body: TmbWebhookPayload;

  try {
    const rawBody = await req.text();
    console.log("TMB Webhook received:", rawBody.substring(0, 500));

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

    console.log("Parsed TMB payload:", JSON.stringify(body).substring(0, 500));
  } catch (parseError) {
    console.error("Failed to parse TMB webhook body:", parseError);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orderId = String(body.pedido || body.id || "unknown");
  const statusPedido = body.status_pedido || "";
  const eventType = "TMB_ORDER_" + (statusPedido.toUpperCase().replace(/\s+/g, "_") || "UNKNOWN");

  // Override client_id based on producer name (lancamento field)
  const producerName = body.lancamento || "";
  let finalClientId = webhookClientId;
  if (producerName && PRODUCER_CLIENT_MAP[producerName]) {
    finalClientId = PRODUCER_CLIENT_MAP[producerName];
    console.log(`Routing producer "${producerName}" to client ${finalClientId}`);
  }

  console.log(`Processing TMB order ${orderId} with status: ${statusPedido}, client: ${finalClientId}`);

  // Only process "Efetivado" orders
  if (statusPedido !== "Efetivado") {
    console.log(`Skipping order ${orderId} - status is not Efetivado: ${statusPedido}`);

    // Log skipped event
    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      client_id: finalClientId || null,
      event_type: eventType,
      transaction_code: orderId,
      status: "skipped",
      payload: body,
      error_message: `Status "${statusPedido}" não é Efetivado`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Order ${orderId} skipped - status is not Efetivado`,
        status: statusPedido,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Map TMB fields to tmb_transactions table
    const transactionData = {
      user_id: webhookUserId,
      client_id: finalClientId || null,
      order_id: orderId,
      product: body.lancamento || null,
      buyer_name: body.cliente || null,
      buyer_email: body.email || null,
      buyer_phone: body.telefone || body.phone || body.celular || null,
      ticket_value: body.valor_total || 0,
      currency: "BRL",
      effective_date: body.data_efetivado || body.criado_em || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      source: "webhook",
    };

    console.log("Upserting TMB transaction:", JSON.stringify(transactionData));

    // Try to insert the transaction - if it's a duplicate, it will be handled by the unique index
    const { data: transaction, error: transactionError } = await supabase
      .from("tmb_transactions")
      .upsert(transactionData, {
        onConflict: "user_id,order_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    // Check if error is due to duplicate based on our unique index (client_id, buyer_email, ticket_value, product, effective_date)
    if (transactionError) {
      const isDuplicateError = transactionError.message.includes('idx_tmb_unique_transaction') ||
                               transactionError.message.includes('duplicate key') ||
                               transactionError.code === '23505';
      
      if (isDuplicateError) {
        console.log(`Duplicate transaction detected for order ${orderId} - ignoring duplicate webhook`);
        
        // Log as duplicate (not error)
        await supabase.from("webhook_logs").insert({
          user_id: webhookUserId,
           client_id: finalClientId || null,
          event_type: eventType,
          transaction_code: orderId,
          status: "duplicate",
          payload: body,
          error_message: "Transação duplicada ignorada - mesmos dados já existem",
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: `Duplicate transaction ${orderId} ignored`,
            duplicate: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.error("Failed to upsert TMB transaction:", transactionError);

      // Log real error
      await supabase.from("webhook_logs").insert({
        user_id: webhookUserId,
        client_id: finalClientId || null,
        event_type: eventType,
        transaction_code: orderId,
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

    console.log("TMB transaction upserted successfully:", transaction?.id);

    // Log success
    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      client_id: finalClientId || null,
      event_type: eventType,
      transaction_code: orderId,
      status: "processed",
      payload: body,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `TMB order ${orderId} processed successfully`,
        transaction_id: transaction?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error processing TMB webhook:", error);

    // Log error
    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      client_id: finalClientId || null,
      event_type: eventType,
      transaction_code: orderId,
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
