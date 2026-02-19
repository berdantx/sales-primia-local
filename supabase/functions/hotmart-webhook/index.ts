import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { convertToUSD, needsConversion } from "../_shared/currency-converter.ts";
import { checkPayloadSize, validateWebhookToken, sanitizeString } from "../_shared/webhook-security.ts";

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
  checkout_phone?: string;
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
  installmentsNumber: number,
  recurrenceNumber: number | null,
  paymentType: string
): string {
  // PRIORIDADE 1: Parcelamento Inteligente
  // payment_type = 'HOTMART_INSTALLMENTS' indica que o cliente escolheu
  // parcelar via Hotmart desde o início (boleto/pix mensal gerenciado pela Hotmart)
  // Esta verificação deve vir ANTES da verificação de subscription
  if (paymentType === 'HOTMART_INSTALLMENTS' && installmentsNumber > 1) {
    return 'Parcelamento Inteligente';
  }
  
  // PRIORIDADE 2: Verificar subscription (Recuperador Inteligente ou Recorrência)
  if (subscription && (subscription.subscriber?.code || subscription.status)) {
    // Se tem recurrence_number + parcelas > 1, mas NÃO é HOTMART_INSTALLMENTS,
    // significa que a Hotmart recuperou uma venda e ofereceu parcelamento (pix/boleto)
    if (recurrenceNumber && recurrenceNumber > 0 && installmentsNumber > 1) {
      return 'Recuperador Inteligente';
    }
    // Recorrência tradicional (assinatura mensal)
    return 'Recorrência';
  }
  
  // PRIORIDADE 3: Parcelamento Padrão (cartão de crédito parcelado - todas parcelas cobradas de uma vez)
  if (installmentsNumber > 1) {
    return 'Parcelamento Padrão';
  }
  
  // Pagamento à vista
  return 'À Vista';
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

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// Helper function to validate transaction values
function validateTransactionValues(
  purchase: PurchaseData,
  transactionCode: string
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
  };

  const priceValue = purchase.price?.value || 0;
  const fullPriceValue = purchase.full_price?.value || 0;

  // Check if price.value is missing
  if (!purchase.price?.value && purchase.full_price?.value) {
    result.warnings.push(`[${transactionCode}] price.value ausente, usando full_price.value como fallback`);
  }

  // Check for zero values
  if (priceValue === 0 && fullPriceValue === 0) {
    result.errors.push(`[${transactionCode}] Ambos price.value e full_price.value são zero ou ausentes`);
    result.isValid = false;
    return result;
  }

  // Check for significant discrepancy between price and full_price
  // Discrepancy is expected (taxes), but should be within reasonable bounds (e.g., 20-30%)
  if (priceValue > 0 && fullPriceValue > 0) {
    const discrepancyPercent = ((fullPriceValue - priceValue) / priceValue) * 100;
    
    // Warning if taxes are higher than 30% (unusual but may be valid)
    if (discrepancyPercent > 30) {
      result.warnings.push(
        `[${transactionCode}] Discrepância alta entre valores: price=${priceValue}, full_price=${fullPriceValue} (${discrepancyPercent.toFixed(1)}% diferença)`
      );
    }
    
    // Error if price is higher than full_price (should never happen)
    if (priceValue > fullPriceValue) {
      result.errors.push(
        `[${transactionCode}] ANOMALIA: price.value (${priceValue}) > full_price.value (${fullPriceValue})`
      );
      // This is a data anomaly but we'll still process - just log it
    }
    
    // Error if discrepancy is extreme (over 50% - likely data corruption)
    if (discrepancyPercent > 50) {
      result.errors.push(
        `[${transactionCode}] ALERTA CRÍTICO: Discrepância extrema de ${discrepancyPercent.toFixed(1)}% entre price e full_price`
      );
      // Still process but flag heavily
    }
  }

  // Validate currency consistency
  const currency = purchase.price?.currency_value;
  if (currency && !['BRL', 'USD', 'EUR'].includes(currency)) {
    result.warnings.push(`[${transactionCode}] Moeda não padrão detectada: ${currency}`);
  }

  return result;
}

// Helper function to log webhook events
async function logWebhookEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  clientId: string | null,
  eventType: string,
  transactionCode: string | null,
  status: 'processed' | 'skipped' | 'error' | 'duplicate' | 'warning',
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Security: validate payload size
  const sizeError = checkPayloadSize(req);
  if (sizeError) return sizeError;

  // Security: validate webhook token
  const tokenError = validateWebhookToken(req);
  if (tokenError) return tokenError;

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

        // Extract subscription data FIRST (needed for billing type determination)
        const subscriberCode = subscription?.subscriber?.code || null;
        const subscriptionStatus = subscription?.status || null;
        // recurrence_number comes from purchase (not subscription.plan) - indicates which installment is being paid
        const recurrenceNumber = (purchase as any)?.recurrence_number || null;

        // Determine billing type (Recorrência, Parcelamento Padrão, Recuperador/Parcelamento Inteligente, or À Vista)
        const billingType = determineBillingType(subscription, installmentsNumber, recurrenceNumber, paymentType);
        console.log(`Billing type determined: ${billingType} (subscription: ${!!subscription}, installments: ${installmentsNumber}, recurrence: ${recurrenceNumber}, paymentType: ${paymentType})`);

        // Extract commissions
        const { marketplaceCommission, producerCommission } = extractCommissions(commissions);
        console.log(`Commissions - Marketplace: ${marketplaceCommission}, Producer: ${producerCommission}`);
        const dateNextCharge = subscription?.date_next_charge 
          ? new Date(subscription.date_next_charge).toISOString() 
          : null;

        // VALIDAÇÃO DE VALORES - Detectar anomalias antes de processar
        const validation = validateTransactionValues(purchase, purchase.transaction || 'UNKNOWN');
        
        // Log warnings
        if (validation.warnings.length > 0) {
          console.warn('Validation warnings:', validation.warnings.join('; '));
        }
        
        // Log errors (but still process - we don't want to lose data)
        if (validation.errors.length > 0) {
          console.error('Validation errors:', validation.errors.join('; '));
          
          // Log validation warning to webhook_logs for visibility
          await logWebhookEvent(
            supabase,
            webhookUserId,
            webhookClientId || null,
            `${eventType}_VALIDATION_WARNING`,
            purchase.transaction || null,
            'warning',
            {
              ...event,
              _validation: {
                warnings: validation.warnings,
                errors: validation.errors,
                price_value: purchase.price?.value,
                full_price_value: purchase.full_price?.value,
              },
            },
            validation.errors.join('; ')
          );
        }

        // Valores base
        // full_price = valor bruto da parcela (com taxas/impostos)
        // price = valor líquido SEM impostos (o que realmente deve ser computado)
        const grossValue = purchase.full_price?.value || purchase.price?.value || 0;
        const netValue = purchase.price?.value || grossValue; // Valor SEM impostos
        
        // Cálculo de computed_value e projected_value baseado no billing_type
        // IMPORTANTE: Sempre usar netValue (price.value - SEM impostos) como computed_value
        // O grossValue (full_price) é apenas informativo
        
        let computedValue: number;
        let projectedValue: number;
        
        if (billingType === 'Parcelamento Inteligente') {
          // Parcelamento Inteligente: usar valor SEM impostos (price.value)
          // Cada webhook representa 1 parcela paga
          computedValue = netValue;
          
          // Projeção: total apenas na 1ª parcela
          if (recurrenceNumber === 1 && installmentsNumber > 1) {
            projectedValue = netValue * installmentsNumber;
          } else {
            // Parcelas subsequentes: já projetado na 1ª parcela
            projectedValue = netValue;
          }
        } else if (billingType === 'Recuperador Inteligente') {
          // Recuperador Inteligente: similar - usar valor sem impostos
          computedValue = netValue;
          if (recurrenceNumber === 1 && installmentsNumber > 1) {
            projectedValue = netValue * installmentsNumber;
          } else {
            projectedValue = netValue;
          }
        } else if (installmentsNumber > 1) {
          // Parcelamento Padrão (cartão de crédito)
          // Usar valor SEM impostos (netValue)
          computedValue = netValue;
          projectedValue = netValue;
        } else {
          // À Vista - usar valor SEM impostos
          computedValue = netValue;
          projectedValue = netValue;
        }

        // Currency conversion: convert exotic currencies to USD
        const rawCurrency = purchase.price?.currency_value || 'BRL';
        let finalCurrency = rawCurrency;
        let finalComputedValue = computedValue;
        let finalGrossValue = grossValue;
        let finalProjectedValue = projectedValue;
        let originalCurrency: string | null = null;
        let originalValue: number | null = null;

        if (needsConversion(rawCurrency)) {
          console.log(`Converting ${computedValue} ${rawCurrency} to USD...`);
          const conversion = await convertToUSD(computedValue, rawCurrency);
          originalCurrency = rawCurrency;
          originalValue = computedValue;
          finalComputedValue = conversion.convertedValue;
          finalCurrency = 'USD';
          // Also convert gross and projected using same rate
          if (conversion.rate !== 1) {
            finalGrossValue = Number((grossValue * (conversion.convertedValue / computedValue)).toFixed(2));
            finalProjectedValue = Number((projectedValue * (conversion.convertedValue / computedValue)).toFixed(2));
          }
          console.log(`Converted: ${computedValue} ${rawCurrency} -> ${finalComputedValue} USD (source: ${conversion.source})`);
        }

        // Prepare transaction record with CORRECTED field mapping
        const transactionData = {
          user_id: webhookUserId,
          client_id: webhookClientId || null,
          transaction_code: purchase.transaction,
          product: product?.name || null,
          buyer_email: buyer?.email || null,
          buyer_name: buyer?.name || null,
          buyer_phone: buyer?.checkout_phone || null,
          currency: finalCurrency,
          original_currency: originalCurrency,
          original_value: originalValue,
          // gross_value_with_taxes = full_price (valor bruto com taxas / valor da parcela)
          gross_value_with_taxes: finalGrossValue,
          // computed_value = valor REALMENTE recebido agora
          computed_value: finalComputedValue,
          // projected_value = valor TOTAL projetado (para recorrências)
          projected_value: finalProjectedValue,
          total_installments: installmentsNumber,
          payment_method: paymentMethod,
          country: purchase.checkout_country?.name || null,
          sck_code: purchase.origin?.sck || null,
          purchase_date: purchaseDate,
          billing_type: billingType,
          source: 'webhook',
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

        // Try to insert the transaction - if it's a duplicate, it will be handled by the unique index
        const { error } = await supabase
          .from('transactions')
          .upsert(transactionData, {
            onConflict: 'transaction_code,user_id',
            ignoreDuplicates: false,
          });

        // Check if error is due to duplicate based on our unique index
        if (error) {
          const isDuplicateError = error.message.includes('idx_hotmart_unique_transaction') ||
                                   error.message.includes('duplicate key') ||
                                   error.code === '23505';
          
          if (isDuplicateError) {
            console.log(`Duplicate transaction detected for ${purchase.transaction} - ignoring duplicate webhook`);
            results.skipped++;
            results.details.push(`Duplicate: ${purchase.transaction}`);
            
            // Log as duplicate
            await logWebhookEvent(
              supabase,
              webhookUserId,
              webhookClientId || null,
              eventType,
              purchase.transaction,
              'duplicate',
              event,
              'Transação duplicada ignorada - mesmos dados já existem'
            );
            continue;
          }

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
