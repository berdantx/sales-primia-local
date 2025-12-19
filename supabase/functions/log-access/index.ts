import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Security alert configuration
const FAILED_LOGIN_THRESHOLD = 3;
const FAILED_LOGIN_WINDOW_MINUTES = 15;

interface LogAccessRequest {
  event_type: 'login_success' | 'login_failed' | 'logout' | 'password_changed' | 'session_revoked';
  email: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { event_type, email, user_id, metadata }: LogAccessRequest = await req.json();

    if (!event_type || !email) {
      return new Response(
        JSON.stringify({ error: 'event_type and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP address from headers
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    // Get User-Agent
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Try to get geolocation from IP (using free service)
    let country = null;
    let city = null;
    
    if (ip_address && ip_address !== 'unknown' && !ip_address.startsWith('127.') && !ip_address.startsWith('192.168.')) {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip_address}?fields=country,city`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status !== 'fail') {
            country = geoData.country;
            city = geoData.city;
          }
        }
      } catch (geoError) {
        console.log('Geolocation lookup failed:', geoError);
      }
    }

    // Insert log entry
    const { error: insertError } = await supabaseAdmin
      .from('access_logs')
      .insert({
        user_id: user_id || null,
        email: email.toLowerCase(),
        event_type,
        ip_address,
        user_agent,
        country,
        city,
        metadata: metadata || {},
      });

    if (insertError) {
      console.error('Error inserting access log:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log access event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Access log recorded: ${event_type} for ${email} from ${ip_address}`);

    // Check for multiple failed login attempts and trigger security alert
    if (event_type === 'login_failed') {
      const windowStart = new Date(Date.now() - FAILED_LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString();
      
      const { count, error: countError } = await supabaseAdmin
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('email', email.toLowerCase())
        .eq('event_type', 'login_failed')
        .gte('created_at', windowStart);

      if (countError) {
        console.error('Error counting failed attempts:', countError);
      } else if (count && count >= FAILED_LOGIN_THRESHOLD) {
        console.log(`Security alert threshold reached: ${count} failed attempts for ${email}`);
        
        // Call security-alert edge function
        try {
          const alertResponse = await fetch(`${supabaseUrl}/functions/v1/security-alert`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.toLowerCase(),
              failed_attempts: count,
              ip_address,
              city,
              country,
            }),
          });

          if (!alertResponse.ok) {
            const errorText = await alertResponse.text();
            console.error('Security alert function failed:', errorText);
          } else {
            console.log('Security alert sent successfully');
          }
        } catch (alertError) {
          console.error('Error calling security-alert function:', alertError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-access function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
