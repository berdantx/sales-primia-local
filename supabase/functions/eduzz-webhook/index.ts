import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { convertToUSD, needsConversion } from "../_shared/currency-converter.ts";

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
  // New Eduzz format with nested data
  data?: {
    id?: string | number;
    status?: string;
    value?: number;
    currency?: string;
    created_at?: string;
    createdAt?: string;
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
    price?: {
      currency?: string;
      value?: number;
      paid?: {
        currency?: string;
        value?: number;
      };
    };
    items?: Array<{
      productId?: string;
      name?: string;
      parentId?: string;
    }>;
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      content?: string;
    };
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    message?: string;
  };
}

// Events that indicate cancellation or chargeback
const CANCELLATION_EVENTS = [
  'myeduzz.invoice_canceled',
  'myeduzz.invoice_chargeback',
];

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookUserId = Deno.env.get("WEBHOOK_USER_ID")!;
  const defaultClientId = Deno.env.get("WEBHOOK_CLIENT_ID");

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

    const parsed = JSON.parse(rawBody);
    
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

  // Extract event type from payload
  const eventName = body.event || '';
  const isCancellation = CANCELLATION_EVENTS.includes(eventName);

  // Support both new format (data object) and old format (flat)
  const buyer = body.data?.buyer ?? {};
  const productData = body.data?.product;

  const saleId = String(body.id || body.data?.id || body.sale_id || "unknown");
  const saleStatus = body.data?.status || body.sale_status || body.status || "";
  
  // Determine event type for logging
  let eventType: string;
  if (isCancellation) {
    eventType = eventName === 'myeduzz.invoice_chargeback' 
      ? 'EDUZZ_SALE_CHARGEBACK' 
      : 'EDUZZ_SALE_CANCELED';
  } else {
    eventType = "EDUZZ_SALE_" + (saleStatus.toUpperCase().replace(/\s+/g, "_") || "UNKNOWN");
  }

  console.log(`Processing Eduzz sale ${saleId} - event: ${eventName}, status: ${saleStatus}, isCancellation: ${isCancellation}`);

  // ---- CANCELLATION / CHARGEBACK FLOW ----
  if (isCancellation) {
    try {
      // Try to find existing transaction by sale_id
      let query = supabase
        .from("eduzz_transactions")
        .select("id, sale_id, status")
        .eq("sale_id", saleId);
      
      if (webhookClientId) {
        query = query.eq("client_id", webhookClientId);
      }

      const { data: existing, error: findError } = await query.maybeSingle();

      if (findError) {
        console.error("Error finding transaction for cancellation:", findError);
      }

      if (existing) {
        // Update existing transaction to canceled
        const { error: updateError } = await supabase
          .from("eduzz_transactions")
          .update({ 
            status: 'cancelado', 
            cancelled_at: new Date().toISOString() 
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating transaction to canceled:", updateError);
          
          await supabase.from("webhook_logs").insert({
            user_id: webhookUserId,
            client_id: webhookClientId || null,
            event_type: eventType,
            transaction_code: saleId,
            status: "error",
            payload: body,
            error_message: updateError.message,
          });

          return new Response(JSON.stringify({ success: false, error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`Transaction ${saleId} updated to cancelado (was: ${existing.status})`);

        await supabase.from("webhook_logs").insert({
          user_id: webhookUserId,
          client_id: webhookClientId || null,
          event_type: eventType,
          transaction_code: saleId,
          status: "processed",
          payload: body,
        });

        return new Response(JSON.stringify({
          success: true,
          message: `Transaction ${saleId} marked as canceled`,
          action: 'updated',
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Transaction not found - insert as canceled
        const itemsData = body.data?.items;
        const priceData = body.data?.price;
        const utmData = body.data?.utm;
        const productName = itemsData?.[0]?.name || productData?.name || body.product_name || body.product || null;
        const productId = itemsData?.[0]?.productId || (productData?.id ? String(productData.id) : null) || (body.product_id ? String(body.product_id) : null);
        const saleValue = priceData?.paid?.value || priceData?.value || body.data?.value || body.sale_amount || body.sale_value || body.value || 0;
        const currency = priceData?.currency || body.data?.currency || "BRL";
        const saleDate = body.data?.createdAt || body.data?.created_at || body.sale_date || body.created_at || new Date().toISOString();

        const { error: insertError } = await supabase
          .from("eduzz_transactions")
          .insert({
            user_id: webhookUserId,
            client_id: webhookClientId || null,
            sale_id: saleId,
            product: productName,
            product_id: productId,
            buyer_name: buyer.name || body.client_name || body.buyer_name || null,
            buyer_email: buyer.email || body.client_email || body.buyer_email || null,
            buyer_phone: buyer.cellphone || buyer.phone || body.client_phone || body.buyer_phone || null,
            sale_value: saleValue,
            currency: currency,
            sale_date: saleDate,
            utm_source: utmData?.source || body.data?.utm_source || body.utm_source || null,
            utm_medium: utmData?.medium || body.data?.utm_medium || body.utm_medium || null,
            utm_campaign: utmData?.campaign || body.data?.utm_campaign || body.utm_campaign || null,
            utm_content: utmData?.content || body.data?.utm_content || body.utm_content || null,
            source: "webhook",
            status: 'cancelado',
            cancelled_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error inserting canceled transaction:", insertError);
          
          await supabase.from("webhook_logs").insert({
            user_id: webhookUserId,
            client_id: webhookClientId || null,
            event_type: eventType,
            transaction_code: saleId,
            status: "error",
            payload: body,
            error_message: insertError.message,
          });

          return new Response(JSON.stringify({ success: false, error: insertError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`Canceled transaction ${saleId} inserted (no prior record found)`);

        await supabase.from("webhook_logs").insert({
          user_id: webhookUserId,
          client_id: webhookClientId || null,
          event_type: eventType,
          transaction_code: saleId,
          status: "processed",
          payload: body,
        });

        return new Response(JSON.stringify({
          success: true,
          message: `Canceled transaction ${saleId} inserted`,
          action: 'inserted_as_canceled',
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Unexpected error processing cancellation:", error);

      await supabase.from("webhook_logs").insert({
        user_id: webhookUserId,
        client_id: webhookClientId || null,
        event_type: eventType,
        transaction_code: saleId,
        status: "error",
        payload: body,
        error_message: error instanceof Error ? error.message : String(error),
      });

      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ---- APPROVED SALE FLOW (existing logic) ----
  const approvedStatuses = ["approved", "aprovado", "pago", "paid", "completed"];
  const isApproved = approvedStatuses.some(s => saleStatus.toLowerCase().includes(s));

  if (!isApproved) {
    console.log(`Skipping sale ${saleId} - status is not approved: ${saleStatus}`);

    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      client_id: webhookClientId || null,
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
    const priceData = body.data?.price;
    const itemsData = body.data?.items;
    const utmData = body.data?.utm;
    
    const productName = itemsData?.[0]?.name || productData?.name || body.product_name || body.product || null;
    const productId = itemsData?.[0]?.productId || (productData?.id ? String(productData.id) : null) || (body.product_id ? String(body.product_id) : null);
    
    const saleValue = priceData?.paid?.value || priceData?.value || body.data?.value || body.sale_amount || body.sale_value || body.value || 0;
    const currency = priceData?.currency || body.data?.currency || "BRL";
    
    const utmSource = utmData?.source || body.data?.utm_source || body.utm_source || null;
    const utmMedium = utmData?.medium || body.data?.utm_medium || body.utm_medium || null;
    const utmCampaign = utmData?.campaign || body.data?.utm_campaign || body.utm_campaign || null;
    const utmContent = utmData?.content || body.data?.utm_content || body.utm_content || null;
    
    const saleDate = body.data?.createdAt || body.data?.created_at || body.sale_date || body.created_at || new Date().toISOString();

    // Currency conversion
    let finalValue = saleValue;
    let finalCurrency = currency;
    let originalCurrency: string | null = null;
    let originalValue: number | null = null;

    if (needsConversion(currency)) {
      console.log(`Converting ${saleValue} ${currency} to USD...`);
      const conversion = await convertToUSD(saleValue, currency);
      originalCurrency = currency;
      originalValue = saleValue;
      finalValue = conversion.convertedValue;
      finalCurrency = 'USD';
      console.log(`Converted: ${saleValue} ${currency} -> ${finalValue} USD (rate: ${conversion.rate}, source: ${conversion.source})`);
    }

    const transactionData = {
      user_id: webhookUserId,
      client_id: webhookClientId || null,
      sale_id: saleId,
      invoice_code: body.invoice_code || null,
      product: productName,
      product_id: productId,
      buyer_name: buyer.name || body.client_name || body.buyer_name || null,
      buyer_email: buyer.email || body.client_email || body.buyer_email || null,
      buyer_phone: buyer.cellphone || buyer.phone || body.client_phone || body.buyer_phone || null,
      sale_value: finalValue,
      currency: finalCurrency,
      original_currency: originalCurrency,
      original_value: originalValue,
      sale_date: saleDate,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      source: "webhook",
      status: "paid",
    };

    console.log("Upserting Eduzz transaction:", JSON.stringify(transactionData));

    const { data: transaction, error: transactionError } = await supabase
      .from("eduzz_transactions")
      .upsert(transactionData, {
        onConflict: "user_id,sale_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (transactionError) {
      const isDuplicateError = transactionError.message.includes('idx_eduzz_unique_transaction') ||
                               transactionError.message.includes('duplicate key') ||
                               transactionError.code === '23505';
      
      if (isDuplicateError) {
        console.log(`Duplicate transaction detected for sale ${saleId}`);
        
        await supabase.from("webhook_logs").insert({
          user_id: webhookUserId,
          client_id: webhookClientId || null,
          event_type: eventType,
          transaction_code: saleId,
          status: "duplicate",
          payload: body,
          error_message: "Transação duplicada ignorada - mesmos dados já existem",
        });

        return new Response(
          JSON.stringify({ success: true, message: `Duplicate transaction ${saleId} ignored`, duplicate: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("Failed to upsert Eduzz transaction:", transactionError);

      await supabase.from("webhook_logs").insert({
        user_id: webhookUserId,
        client_id: webhookClientId || null,
        event_type: eventType,
        transaction_code: saleId,
        status: "error",
        payload: body,
        error_message: transactionError.message,
      });

      return new Response(
        JSON.stringify({ success: false, error: transactionError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Eduzz transaction upserted successfully:", transaction?.id);

    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      client_id: webhookClientId || null,
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error processing Eduzz webhook:", error);

    await supabase.from("webhook_logs").insert({
      user_id: webhookUserId,
      client_id: webhookClientId || null,
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
