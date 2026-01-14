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

// Helper function to log webhook events
async function logWebhookEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  eventType: string,
  transactionCode: string | null,
  status: 'processed' | 'skipped' | 'error',
  payload: unknown,
  errorMessage?: string
) {
  try {
    await supabase.from('webhook_logs').insert({
      user_id: userId,
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
    
    // Get client_id from query params
    const url = new URL(req.url);
    const clientId = url.searchParams.get('client_id');
    
    // Fallback to env vars if not in query
    const webhookUserId = Deno.env.get('WEBHOOK_USER_ID');
    const webhookClientId = clientId || Deno.env.get('WEBHOOK_CLIENT_ID');

    if (!webhookUserId) {
      console.error('WEBHOOK_USER_ID not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the incoming body - Active Campaign sends application/x-www-form-urlencoded
    const contentType = req.headers.get('content-type') || '';
    let bodyData: Record<string, string> = {};
    let rawPayload: unknown;
    let source = 'active_campaign';

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
      if (jsonBody.body && typeof jsonBody.body === 'object') {
        bodyData = jsonBody.body;
      } else {
        bodyData = jsonBody;
      }
      
      // Detect source from payload structure
      if (jsonBody.source) {
        source = jsonBody.source;
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

    // Parse the lead data
    const leadData = parseActiveCampaignPayload(bodyData);
    
    if (!leadData.email) {
      console.log('Missing email, skipping lead');
      await logWebhookEvent(
        supabase,
        webhookUserId,
        'LEAD_RECEIVED',
        null,
        'skipped',
        rawPayload,
        'Missing email'
      );
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing email' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare lead record
    const leadRecord = {
      client_id: webhookClientId || null,
      external_id: leadData.external_id,
      email: leadData.email,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      phone: leadData.phone,
      ip_address: leadData.ip_address,
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
      source,
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
      'LEAD_RECEIVED',
      leadData.email,
      'processed',
      rawPayload
    );

    return new Response(JSON.stringify({
      success: true,
      message: 'Lead processed successfully',
      lead_id: data.id,
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
