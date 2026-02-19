import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkPayloadSize, validateWebhookToken, sanitizeString } from "../_shared/webhook-security.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Security: validate payload size
  const sizeError = checkPayloadSize(req);
  if (sizeError) return sizeError;

  // Security: validate webhook token
  const tokenError = validateWebhookToken(req);
  if (tokenError) return tokenError;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookUserId = Deno.env.get("WEBHOOK_USER_ID")!;
  const defaultClientId = Deno.env.get("WEBHOOK_CLIENT_ID");

  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get('client_id');
  const webhookClientId = clientIdParam || defaultClientId;

  console.log(`TMB webhook - client_id from URL: ${clientIdParam}, using: ${webhookClientId}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const PRODUCER_CLIENT_MAP: Record<string, string> = {
    "Camila Vieira 2": "b48b649d-1b1b-451d-8eb5-1d8cd38f422c",
  };

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

    const parsed = JSON.parse(rawBody);
    
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

  const producerName = body.lancamento || "";
  let finalClientId = webhookClientId;
  if (producerName && PRODUCER_CLIENT_MAP[producerName]) {
    finalClientId = PRODUCER_CLIENT_MAP[producerName];
    console.log(`Routing producer "${producerName}" to client ${finalClientId}`);
  }

  console.log(`Processing TMB order ${orderId} with status: ${statusPedido}, client: ${finalClientId}`);

  // Process both "Efetivado" and "Cancelado" statuses
  const isEfetivado = statusPedido === "Efetivado";
  const isCancelado = statusPedido === "Cancelado";

  if (!isEfetivado && !isCancelado) {
    console.log(`Skipping order ${orderId} - status is not Efetivado or Cancelado: ${statusPedido}`);

    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      client_id: finalClientId || null,
      event_type: eventType,
      transaction_code: orderId,
      status: "skipped",
      payload: body,
      error_message: `Status "${statusPedido}" não é Efetivado nem Cancelado`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Order ${orderId} skipped - status is not Efetivado or Cancelado`,
        status: statusPedido,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Handle cancellation
    if (isCancelado) {
      console.log(`Processing cancellation for order ${orderId}`);

      // Try to update existing transaction
      const { data: existing, error: findError } = await supabase
        .from("tmb_transactions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (findError) {
        console.error("Error finding transaction for cancellation:", findError);
      }

      if (existing) {
        // Update existing transaction to cancelled
        const { error: updateError } = await supabase
          .from("tmb_transactions")
          .update({ status: "cancelado", cancelled_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating transaction to cancelled:", updateError);
          await supabase.from("webhook_logs").insert({
            user_id: webhookUserId,
            client_id: finalClientId || null,
            event_type: eventType,
            transaction_code: orderId,
            status: "error",
            payload: body,
            error_message: updateError.message,
          });
          return new Response(JSON.stringify({ success: false, error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`Transaction ${orderId} marked as cancelled`);
      } else {
        // Insert new transaction with cancelled status
        const { error: insertError } = await supabase
          .from("tmb_transactions")
          .insert({
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
            status: "cancelado",
            cancelled_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error inserting cancelled transaction:", insertError);
          await supabase.from("webhook_logs").insert({
            user_id: webhookUserId,
            client_id: finalClientId || null,
            event_type: eventType,
            transaction_code: orderId,
            status: "error",
            payload: body,
            error_message: insertError.message,
          });
          return new Response(JSON.stringify({ success: false, error: insertError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`New cancelled transaction inserted for order ${orderId}`);
      }

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
          message: `TMB order ${orderId} cancelled successfully`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Pre-upsert duplicate check by (order_id, client_id) regardless of user_id
    const existingQuery = supabase
      .from("tmb_transactions")
      .select("id, source")
      .eq("order_id", orderId);

    if (finalClientId) {
      existingQuery.eq("client_id", finalClientId);
    }

    const { data: existingTx } = await existingQuery.maybeSingle();

    if (existingTx) {
      console.log(`Duplicate detected for order ${orderId} (existing id: ${existingTx.id}, source: ${existingTx.source}) - skipping`);

      await supabase.from("webhook_logs").insert({
        user_id: webhookUserId,
        client_id: finalClientId || null,
        event_type: eventType,
        transaction_code: orderId,
        status: "duplicate",
        payload: body,
        error_message: `Transação já existe (id: ${existingTx.id}, source: ${existingTx.source})`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Duplicate transaction ${orderId} ignored`,
          duplicate: true,
          existing_id: existingTx.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle "Efetivado" (existing logic)
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
      status: "efetivado",
    };

    console.log("Upserting TMB transaction:", JSON.stringify(transactionData));

    const { data: transaction, error: transactionError } = await supabase
      .from("tmb_transactions")
      .upsert(transactionData, {
        onConflict: "user_id,order_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (transactionError) {
      const isDuplicateError = transactionError.message.includes('idx_tmb_unique_transaction') ||
                               transactionError.message.includes('duplicate key') ||
                               transactionError.code === '23505';
      
      if (isDuplicateError) {
        console.log(`Duplicate transaction detected for order ${orderId} - ignoring duplicate webhook`);
        
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
