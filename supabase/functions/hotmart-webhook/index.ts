import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Payment type mapping from Hotmart to Portuguese
const PAYMENT_TYPE_MAP: Record<string, string> = {
  'CREDIT_CARD': 'Cartão de Crédito',
  'BILLET': 'Boleto',
  'PIX': 'Pix',
  'PAYPAL': 'PayPal',
  'GOOGLE_PAY': 'Google Pay',
  'APPLE_PAY': 'Apple Pay',
  'DEBIT_CARD': 'Cartão de Débito',
  'WALLET': 'Carteira Digital',
  'CASH_PAYMENT': 'Pagamento em Dinheiro',
};

// Business model mapping
const BUSINESS_MODEL_MAP: Record<string, string> = {
  'I': 'Individual',
  'A': 'Afiliado',
  'P': 'Produtor',
};

// Common structures used in both payload formats
interface PurchaseData {
  transaction?: string;
  approved_date?: number;
  order_date?: number;
  status?: string;
  price?: {
    value?: number;
    currency_value?: string;
  };
  full_price?: {
    value?: number;
  };
  payment?: {
    type?: string;
    installments_number?: number;
  };
  checkout_country?: {
    name?: string;
  };
  origin?: {
    sck?: string;
  };
  business_model?: string;
  offer?: {
    code?: string;
  };
}

interface ProductData {
  id?: number;
  ucode?: string;
  name?: string;
}

interface BuyerData {
  email?: string;
  name?: string;
}

interface CommissionData {
  source?: string;
  value?: number;
  currency_value?: string;
}

interface SubscriptionData {
  subscriber?: {
    code?: string;
  };
  status?: string;
  plan?: {
    recurrence_number?: number;
    name?: string;
  };
  date_next_charge?: number;
}

// Hotmart webhook can come in two formats:
// Format v2: { event: "PURCHASE_APPROVED", data: { purchase, product, buyer, subscription, commissions } }
// Format v1: { purchase: { status: "APPROVED", ... }, product, buyer }
interface HotmartWebhookEvent {
  // v2 format fields
  event?: string;
  data?: {
    purchase?: PurchaseData;
    product?: ProductData;
    buyer?: BuyerData;
    subscription?: SubscriptionData;
    commissions?: CommissionData[];
  };
  // v1 format fields (at root level)
  purchase?: PurchaseData;
  product?: ProductData;
  buyer?: BuyerData;
  subscription?: SubscriptionData;
  commissions?: CommissionData[];
}

// Helper function to determine billing type
function determineBillingType(
  subscription: SubscriptionData | undefined,
  installmentsNumber: number
): string {
  if (subscription && (subscription.subscriber?.code || subscription.status)) {
    // É uma recorrência/assinatura
    return 'Recorrência';
  } else if (installmentsNumber > 1) {
    // Parcelamento padrão (mais de 1 parcela)
    return 'Parcelamento Padrão';
  } else {
    // Pagamento à vista
    return 'À Vista';
  }
}

// Helper function to extract commissions
function extractCommissions(commissions: CommissionData[] | undefined): {
  marketplaceCommission: number;
  producerCommission: number;
} {
  if (!commissions || !Array.isArray(commissions)) {
    return { marketplaceCommission: 0, producerCommission: 0 };
  }

  const marketplaceCommission = commissions.find(c => c.source === 'MARKETPLACE')?.value || 0;
  const producerCommission = commissions.find(c => c.source === 'PRODUCER')?.value || 0;

  return { marketplaceCommission, producerCommission };
}

// Helper function to log webhook events
async function logWebhookEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  clientId: string | null,
  eventType: string,
  transactionCode: string | null,
  status: 'processed' | 'skipped' | 'error',
  payload: unknown,
  errorMessage?: string
) {
  try {
    await supabase.from('webhook_logs').insert({
      user_id: userId,
      client_id: clientId,
      event_type: eventType,
      transaction_code: transactionCode,
      status,
      payload,
      error_message: errorMessage || null,
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookUserId = Deno.env.get('WEBHOOK_USER_ID');
    const defaultClientId = Deno.env.get('WEBHOOK_CLIENT_ID');

    // Get client_id from query parameter (priority) or fall back to env var
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get('client_id');
    const webhookClientId = clientIdParam || defaultClientId;

    console.log(`Hotmart webhook - client_id from URL: ${clientIdParam}, using: ${webhookClientId}`);

    if (!webhookUserId) {
      console.error('WEBHOOK_USER_ID not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Parse the incoming JSON (can be array or single object)
    const body = await req.json();
    console.log('Received webhook payload:', JSON.stringify(body, null, 2));

    // Normalize to array
    const events: HotmartWebhookEvent[] = Array.isArray(body) ? body : [body];
    
    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    };

    for (const event of events) {
      // Detect event format and extract data accordingly
      let eventType: string;
      let purchase: PurchaseData | undefined;
      let product: ProductData | undefined;
      let buyer: BuyerData | undefined;
      let subscription: SubscriptionData | undefined;
      let commissions: CommissionData[] | undefined;

      if (event.event && event.data) {
        // Format v2: { event: "PURCHASE_APPROVED", data: { purchase, product, buyer, subscription, commissions } }
        eventType = event.event;
        purchase = event.data.purchase;
        product = event.data.product;
        buyer = event.data.buyer;
        subscription = event.data.subscription;
        commissions = event.data.commissions;
        console.log('Detected v2 format with event:', eventType);
      } else if (event.purchase) {
        // Format v1: { purchase: { status: "APPROVED", ... }, product, buyer }
        const status = event.purchase.status;
        eventType = status === 'APPROVED' ? 'PURCHASE_APPROVED' : status || 'unknown';
        purchase = event.purchase;
        product = event.product;
        buyer = event.buyer;
        subscription = event.subscription;
        commissions = event.commissions;
        console.log('Detected v1 format with status:', status, '-> eventType:', eventType);
      } else {
        eventType = 'unknown';
        console.log('Unknown payload format');
      }

      const transactionCode = purchase?.transaction || null;

      try {
        // Only process PURCHASE_APPROVED events
        if (eventType !== 'PURCHASE_APPROVED') {
          console.log(`Skipping event type: ${eventType}`);
          results.skipped++;
          results.details.push(`Skipped: ${eventType || 'unknown event'}`);
          
          // Log skipped event
          await logWebhookEvent(
            supabase,
            webhookUserId,
            webhookClientId || null,
            eventType,
            transactionCode,
            'skipped',
            event,
            `Event type "${eventType}" is not PURCHASE_APPROVED`
          );
          continue;
        }

        if (!purchase?.transaction) {
          console.log('Missing transaction code, skipping');
          results.skipped++;
          results.details.push('Skipped: missing transaction code');
          
          // Log skipped event
          await logWebhookEvent(
            supabase,
            webhookUserId,
            webhookClientId || null,
            eventType,
            null,
            'skipped',
            event,
            'Missing transaction code'
          );
          continue;
        }

        // Parse approved_date (timestamp in milliseconds)
        let purchaseDate: string | null = null;
        if (purchase.approved_date) {
          purchaseDate = new Date(purchase.approved_date).toISOString();
        } else if (purchase.order_date) {
          purchaseDate = new Date(purchase.order_date).toISOString();
        }

        // Map payment type
        const paymentType = purchase.payment?.type || '';
        const paymentMethod = PAYMENT_TYPE_MAP[paymentType] || paymentType || null;

        // Get installments number
        const installmentsNumber = purchase.payment?.installments_number || 1;

        // Determine billing type (Recorrência, Parcelamento Padrão, or À Vista)
        const billingType = determineBillingType(subscription, installmentsNumber);
        console.log(`Billing type determined: ${billingType} (subscription: ${!!subscription}, installments: ${installmentsNumber})`);

        // Extract commissions
        const { marketplaceCommission, producerCommission } = extractCommissions(commissions);
        console.log(`Commissions - Marketplace: ${marketplaceCommission}, Producer: ${producerCommission}`);

        // Extract subscription data
        const subscriberCode = subscription?.subscriber?.code || null;
        const subscriptionStatus = subscription?.status || null;
        const recurrenceNumber = subscription?.plan?.recurrence_number || null;
        const dateNextCharge = subscription?.date_next_charge 
          ? new Date(subscription.date_next_charge).toISOString() 
          : null;

        // Prepare transaction record with CORRECTED field mapping
        const transactionData = {
          user_id: webhookUserId,
          client_id: webhookClientId || null,
          transaction_code: purchase.transaction,
          product: product?.name || null,
          buyer_email: buyer?.email || null,
          buyer_name: buyer?.name || null,
          currency: purchase.price?.currency_value || 'BRL',
          // CORREÇÃO: gross_value_with_taxes = full_price (valor bruto com taxas)
          gross_value_with_taxes: purchase.full_price?.value || purchase.price?.value || 0,
          // CORREÇÃO: computed_value = price (valor líquido que o produtor recebe)
          computed_value: purchase.price?.value || 0,
          total_installments: installmentsNumber,
          payment_method: paymentMethod,
          country: purchase.checkout_country?.name || null,
          sck_code: purchase.origin?.sck || null,
          purchase_date: purchaseDate,
          // CORREÇÃO: billing_type dinâmico baseado na presença de subscription
          billing_type: billingType,
          source: 'webhook',
          // NOVOS CAMPOS
          business_model: purchase.business_model || null,
          offer_code: purchase.offer?.code || null,
          product_id: product?.id?.toString() || null,
          product_ucode: product?.ucode || null,
          marketplace_commission: marketplaceCommission,
          producer_commission: producerCommission,
          recurrence_number: recurrenceNumber,
          subscriber_code: subscriberCode,
          subscription_status: subscriptionStatus,
          date_next_charge: dateNextCharge,
        };

        console.log('Inserting transaction:', JSON.stringify(transactionData, null, 2));

        // Upsert transaction (insert or update if exists)
        const { error } = await supabase
          .from('transactions')
          .upsert(transactionData, {
            onConflict: 'transaction_code,user_id',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('Error inserting transaction:', error);
          results.errors++;
          results.details.push(`Error: ${purchase.transaction} - ${error.message}`);
          
          // Log error
          await logWebhookEvent(
            supabase,
            webhookUserId,
            webhookClientId || null,
            eventType,
            purchase.transaction,
            'error',
            event,
            error.message
          );
        } else {
          console.log(`Transaction processed: ${purchase.transaction}`);
          results.processed++;
          results.details.push(`Processed: ${purchase.transaction}`);
          
          // Log success
          await logWebhookEvent(
            supabase,
            webhookUserId,
            webhookClientId || null,
            eventType,
            purchase.transaction,
            'processed',
            event
          );
        }
      } catch (eventError) {
        console.error('Error processing event:', eventError);
        results.errors++;
        const errorMsg = eventError instanceof Error ? eventError.message : 'Unknown error';
        results.details.push(`Error: ${errorMsg}`);
        
        // Log error
        await logWebhookEvent(
          supabase,
          webhookUserId,
          webhookClientId || null,
          eventType,
          transactionCode,
          'error',
          event,
          errorMsg
        );
      }
    }

    console.log('Webhook processing complete:', results);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.processed} transactions, skipped ${results.skipped}, errors ${results.errors}`,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
