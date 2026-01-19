import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  external_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  ip_address: string | null;
  organization: string | null;
  customer_account: string | null;
  tags: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_id: string | null;
  utm_term: string | null;
  utm_content: string | null;
  page_url: string | null;
  series_id: string | null;
}

type LeadSource = 'active_campaign' | 'hotmart' | 'eduzz' | 'n8n' | 'unknown';

// Extract real IP from request headers (proxies, CDNs, load balancers)
function extractRealIpFromRequest(req: Request): string | null {
  // Headers in order of priority (most reliable first)
  const xRealIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
  const trueClientIp = req.headers.get('true-client-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  
  if (xRealIp) return xRealIp.trim();
  if (cfConnectingIp) return cfConnectingIp.trim();
  if (trueClientIp) return trueClientIp.trim();
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  
  return null;
}

// Check if an IP is local or private (should be ignored)
function isPrivateOrLocalIp(ip: string | null): boolean {
  if (!ip) return true;
  
  const normalizedIp = ip.trim().toLowerCase();
  
  // Local IPs
  if (normalizedIp === '127.0.0.1' || normalizedIp === '::1' || normalizedIp === 'localhost') {
    return true;
  }
  
  // Private network ranges
  // 10.0.0.0 – 10.255.255.255
  if (/^10\./.test(normalizedIp)) return true;
  
  // 172.16.0.0 – 172.31.255.255
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(normalizedIp)) return true;
  
  // 192.168.0.0 – 192.168.255.255
  if (/^192\.168\./.test(normalizedIp)) return true;
  
  return false;
}

// Lookup geolocation for an IP address
interface GeolocationResult {
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  success: boolean;
}

async function lookupGeolocation(ip: string | null): Promise<GeolocationResult> {
  if (!ip || isPrivateOrLocalIp(ip)) {
    return {
      country: null,
      country_code: null,
      city: null,
      region: null,
      success: false,
    };
  }

  try {
    // Use ip-api.com free API
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city`);
    
    if (!response.ok) {
      console.error(`Geolocation API error: ${response.status}`);
      return { country: null, country_code: null, city: null, region: null, success: false };
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country || null,
        country_code: data.countryCode || null,
        city: data.city || null,
        region: data.regionName || null,
        success: true,
      };
    } else {
      console.warn(`Geolocation lookup failed for ${ip}: ${data.message}`);
      return { country: null, country_code: null, city: null, region: null, success: false };
    }
  } catch (error) {
    console.error('Geolocation lookup error:', error);
    return { country: null, country_code: null, city: null, region: null, success: false };
  }
}

// Parse Active Campaign format: contact[field] and contact[fields][field]
function parseActiveCampaignPayload(body: Record<string, string>): LeadData {
  return {
    external_id: body['contact[id]'] || null,
    email: body['contact[email]'] || '',
    first_name: body['contact[first_name]'] || null,
    last_name: body['contact[last_name]'] || null,
    phone: body['contact[phone]'] || null,
    ip_address: body['contact[ip4]'] || null,
    organization: body['contact[orgname]'] || null,
    customer_account: body['contact[customer_acct_name]'] || null,
    tags: body['contact[tags]'] || null,
    utm_source: body['contact[fields][utm_source]'] || null,
    utm_medium: body['contact[fields][utm_medium]'] || null,
    utm_campaign: body['contact[fields][utm_campaign]'] || null,
    utm_id: body['contact[fields][utm_id]'] || null,
    utm_term: body['contact[fields][utm_term]'] || null,
    utm_content: body['contact[fields][utm_content]'] || null,
    page_url: body['contact[fields][link_pagina]'] || null,
    series_id: body['seriesid'] || null,
  };
}

// Parse Hotmart webhook format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseHotmartPayload(body: any): LeadData {
  // Hotmart can send in v1 or v2 format
  const data = body.data || body;
  const buyer = data.buyer || body.buyer || {};
  const purchase = data.purchase || body.purchase || {};
  const subscription = data.subscription || body.subscription || {};
  
  // Extract UTMs from tracking or sck
  const tracking = purchase.tracking || {};
  const sck = purchase.origin?.sck || '';
  
  return {
    external_id: buyer.code || null,
    email: buyer.email || '',
    first_name: buyer.name?.split(' ')[0] || null,
    last_name: buyer.name?.split(' ').slice(1).join(' ') || null,
    phone: buyer.phone || buyer.checkout_phone || null,
    ip_address: purchase.buyer_ip || null,
    organization: null,
    customer_account: null,
    tags: subscription.plan?.name ? `[${subscription.plan.name}]` : null,
    utm_source: tracking.source || tracking.src || null,
    utm_medium: tracking.medium || null,
    utm_campaign: tracking.campaign || null,
    utm_id: null,
    utm_term: null,
    utm_content: tracking.content || null,
    page_url: tracking.external_code || null,
    series_id: sck || null,
  };
}

// Parse Eduzz webhook format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEduzzPayload(body: any): LeadData {
  // Eduzz sends customer data
  const customer = body.customer || body.cliente || body;
  const sale = body.sale || body.venda || {};
  const utm = body.utm || sale.utm || {};
  
  const fullName = customer.name || customer.nome || '';
  const nameParts = fullName.split(' ');
  
  return {
    external_id: customer.id?.toString() || customer.code || null,
    email: customer.email || '',
    first_name: nameParts[0] || null,
    last_name: nameParts.slice(1).join(' ') || null,
    phone: customer.phone || customer.telefone || customer.cellphone || null,
    ip_address: sale.buyer_ip || body.ip || null,
    organization: null,
    customer_account: null,
    tags: sale.product_name ? `[${sale.product_name}]` : null,
    utm_source: utm.source || utm.utm_source || null,
    utm_medium: utm.medium || utm.utm_medium || null,
    utm_campaign: utm.campaign || utm.utm_campaign || null,
    utm_id: utm.id || utm.utm_id || null,
    utm_term: utm.term || utm.utm_term || null,
    utm_content: utm.content || utm.utm_content || null,
    page_url: sale.checkout_url || null,
    series_id: sale.tracker || null,
  };
}

// Parse generic/n8n format (flexible)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGenericPayload(body: any): LeadData {
  // Try to find email in various places
  const email = body.email || body.contact_email || body.buyer_email || 
                body.customer?.email || body.contact?.email || '';
  
  // Try to find name
  const name = body.name || body.full_name || body.contact_name || 
               body.buyer_name || body.customer?.name || body.contact?.name || '';
  const nameParts = name.split(' ');
  
  return {
    external_id: body.id?.toString() || body.external_id || body.contact_id || null,
    email,
    first_name: body.first_name || body.firstName || nameParts[0] || null,
    last_name: body.last_name || body.lastName || nameParts.slice(1).join(' ') || null,
    phone: body.phone || body.telefone || body.cellphone || body.whatsapp || null,
    ip_address: body.ip || body.ip_address || body.buyer_ip || null,
    organization: body.organization || body.company || body.empresa || null,
    customer_account: body.customer_account || null,
    tags: body.tags || null,
    utm_source: body.utm_source || body.source || null,
    utm_medium: body.utm_medium || body.medium || null,
    utm_campaign: body.utm_campaign || body.campaign || null,
    utm_id: body.utm_id || null,
    utm_term: body.utm_term || null,
    utm_content: body.utm_content || null,
    page_url: body.page_url || body.landing_page || body.referrer || null,
    series_id: body.series_id || body.list_id || null,
  };
}

// Detect the source from payload structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectSource(body: any, querySource: string | null): LeadSource {
  // Explicit source in query or body
  if (querySource) {
    const normalized = querySource.toLowerCase();
    if (['active_campaign', 'hotmart', 'eduzz', 'n8n'].includes(normalized)) {
      return normalized as LeadSource;
    }
  }
  if (body.source) {
    const normalized = body.source.toLowerCase();
    if (['active_campaign', 'hotmart', 'eduzz', 'n8n'].includes(normalized)) {
      return normalized as LeadSource;
    }
  }
  
  // Detect by payload structure
  // Active Campaign format
  if (body['contact[email]'] || body['contact[id]']) {
    return 'active_campaign';
  }
  
  // Hotmart format
  if (body.event && (body.event.includes('PURCHASE') || body.event.includes('SUBSCRIPTION'))) {
    return 'hotmart';
  }
  if (body.data?.buyer || body.buyer) {
    return 'hotmart';
  }
  
  // Eduzz format
  if (body.trans_cod || body.cliente || body.eduzz_id) {
    return 'eduzz';
  }
  if (body.api_key || body.sale?.eduzz_id) {
    return 'eduzz';
  }
  
  // n8n wrapper
  if (body.webhookUrl?.includes('n8n')) {
    return 'n8n';
  }
  
  return 'unknown';
}

// Helper function to log webhook events
async function logWebhookEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  clientId: string | null,
  eventType: string,
  transactionCode: string | null,
  status: 'processed' | 'skipped' | 'error' | 'duplicate',
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
    
    // Use environment variable for system user (for logging)
    const webhookUserId = Deno.env.get('WEBHOOK_USER_ID');
    // Fallback client ID from environment (for backwards compatibility)
    const webhookClientIdFallback = Deno.env.get('WEBHOOK_CLIENT_ID');

    if (!webhookUserId) {
      console.error('WEBHOOK_USER_ID not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract client slug from URL path
    // URL format: /leads-webhook/{client_slug} or /leads-webhook (fallback)
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts will be like ['leads-webhook', 'client-slug'] or just ['leads-webhook']
    const clientSlug = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;
    
    let resolvedClientId: string | null = null;

    if (clientSlug && clientSlug !== 'leads-webhook') {
      // Look up client by slug
      console.log('Looking up client by slug:', clientSlug);
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, is_active')
        .eq('slug', clientSlug)
        .single();

      if (clientError || !client) {
        console.error('Client not found for slug:', clientSlug, clientError);
        return new Response(JSON.stringify({ 
          error: 'Client not found',
          slug: clientSlug 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (client.is_active === false) {
        console.error('Client is inactive:', clientSlug);
        return new Response(JSON.stringify({ 
          error: 'Client is inactive',
          slug: clientSlug 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      resolvedClientId = client.id;
      console.log('Resolved client:', client.name, client.id);
    } else {
      // Fallback to environment variable (backwards compatibility)
      resolvedClientId = webhookClientIdFallback || null;
      console.log('Using fallback client ID from env:', resolvedClientId);
    }

    // Parse the incoming body
    const contentType = req.headers.get('content-type') || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bodyData: any = {};
    let rawPayload: unknown;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      params.forEach((value, key) => {
        bodyData[key] = value;
      });
      rawPayload = bodyData;
    } else if (contentType.includes('application/json')) {
      const jsonBody = await req.json();
      rawPayload = jsonBody;
      
      // Handle n8n wrapper format: { body: { ... } }
      if (jsonBody.body && typeof jsonBody.body === 'object' && !Array.isArray(jsonBody.body)) {
        bodyData = jsonBody.body;
      } else {
        bodyData = jsonBody;
      }
    } else {
      // Try to parse as JSON anyway
      try {
        const text = await req.text();
        const jsonBody = JSON.parse(text);
        rawPayload = jsonBody;
        bodyData = jsonBody.body || jsonBody;
      } catch {
        console.error('Failed to parse body');
        return new Response(JSON.stringify({ error: 'Invalid body format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Received lead payload:', JSON.stringify(rawPayload, null, 2));

    // Check for ping/validation requests from platforms
    // Active Campaign sends { event: "ping", data: { message: "ping" } }
    // Hotmart/Eduzz may send similar validation requests
    const isPingRequest = 
      bodyData.event === 'ping' || 
      bodyData.type === 'ping' ||
      bodyData.action === 'ping' ||
      bodyData.message === 'ping' ||
      (bodyData.data?.message === 'ping');
    
    if (isPingRequest) {
      console.log('Ping/validation request detected, responding with 200');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook endpoint is active',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect source from payload (no query param needed)
    const source = detectSource(bodyData, bodyData.source || null);
    console.log('Detected source:', source);

    // Parse based on source
    let leadData: LeadData;
    switch (source) {
      case 'hotmart':
        leadData = parseHotmartPayload(bodyData);
        break;
      case 'eduzz':
        leadData = parseEduzzPayload(bodyData);
        break;
      case 'active_campaign':
        leadData = parseActiveCampaignPayload(bodyData);
        break;
      case 'n8n':
      default:
        leadData = parseGenericPayload(bodyData);
        break;
    }

    console.log('Parsed lead data:', JSON.stringify(leadData, null, 2));
    
    if (!leadData.email) {
      console.log('Missing email, skipping lead');
      await logWebhookEvent(
        supabase,
        webhookUserId,
        resolvedClientId,
        'LEAD_RECEIVED',
        null,
        'skipped',
        rawPayload,
        'Missing email'
      );
      // Return 200 even for missing email to prevent webhook retry loops
      // But indicate in the response that the lead was not processed
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Lead skipped - missing email',
        received: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve final IP address - prefer payload IP unless it's private/local
    const requestIp = extractRealIpFromRequest(req);
    const payloadIp = leadData.ip_address;
    
    // Use payload IP only if valid (not private/local), otherwise use request IP
    const finalIpAddress = payloadIp && !isPrivateOrLocalIp(payloadIp)
      ? payloadIp
      : requestIp;
    
    console.log('IP resolution:', {
      payloadIp,
      requestIp,
      finalIp: finalIpAddress,
      isPayloadIpPrivate: isPrivateOrLocalIp(payloadIp)
    });

    // Lookup geolocation for the IP
    const geo = await lookupGeolocation(finalIpAddress);
    console.log('Geolocation result:', geo);

    // Prepare lead record
    const leadRecord = {
      client_id: resolvedClientId,
      external_id: leadData.external_id,
      email: leadData.email,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      phone: leadData.phone,
      ip_address: finalIpAddress,
      country: geo.country,
      country_code: geo.country_code,
      city: geo.city,
      region: geo.region,
      organization: leadData.organization,
      customer_account: leadData.customer_account,
      tags: leadData.tags,
      utm_source: leadData.utm_source,
      utm_medium: leadData.utm_medium,
      utm_campaign: leadData.utm_campaign,
      utm_id: leadData.utm_id,
      utm_term: leadData.utm_term,
      utm_content: leadData.utm_content,
      page_url: leadData.page_url,
      series_id: leadData.series_id,
      source: source === 'unknown' ? 'n8n' : source,
      raw_payload: rawPayload,
    };

    console.log('Inserting lead:', JSON.stringify(leadRecord, null, 2));

    // Insert lead
    const { data, error } = await supabase
      .from('leads')
      .insert(leadRecord)
      .select()
      .single();

    if (error) {
      console.error('Error inserting lead:', error);
      await logWebhookEvent(
        supabase,
        webhookUserId,
        resolvedClientId,
        'LEAD_RECEIVED',
        leadData.email,
        'error',
        rawPayload,
        error.message
      );
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Lead inserted successfully:', data.id);

    // Log success
    await logWebhookEvent(
      supabase,
      webhookUserId,
      resolvedClientId,
      'LEAD_RECEIVED',
      leadData.email,
      'processed',
      rawPayload
    );

    return new Response(JSON.stringify({
      success: true,
      message: 'Lead processed successfully',
      lead_id: data.id,
      source,
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
