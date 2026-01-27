import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeolocationResult {
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  success: boolean;
  error?: string;
}

// Batch lookup using ip-api.com (max 100 IPs per request)
async function lookupIpBatch(ips: string[]): Promise<Map<string, GeolocationResult>> {
  const results = new Map<string, GeolocationResult>();
  
  if (ips.length === 0) {
    return results;
  }

  try {
    const response = await fetch('http://ip-api.com/batch?fields=status,message,country,countryCode,regionName,city,query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ips.slice(0, 100)),
    });

    if (!response.ok) {
      throw new Error(`IP API returned ${response.status}`);
    }

    const data = await response.json();
    
    for (const item of data) {
      if (item.status === 'success') {
        results.set(item.query, {
          country: item.country || null,
          country_code: item.countryCode || null,
          city: item.city || null,
          region: item.regionName || null,
          success: true,
        });
      } else {
        results.set(item.query, {
          country: null,
          country_code: null,
          city: null,
          region: null,
          success: false,
          error: item.message || 'Failed to lookup IP',
        });
      }
    }
  } catch (error) {
    console.error('Batch IP lookup failed:', error);
    for (const ip of ips) {
      results.set(ip, {
        country: null,
        country_code: null,
        city: null,
        region: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// IPs conhecidos de servidores de integração (ActiveCampaign/AWS Ohio)
// Esses IPs são de servidores que enviam webhooks, não de leads reais
const KNOWN_INTEGRATION_SERVER_IPS = [
  '3.23.123.112',
  '3.21.194.219',
  '3.21.104.219',
  '18.223.228.186',
  '3.140.234.100',
];

// Check if IP is private/local (shouldn't be geolocated)
function isPrivateOrLocalIp(ip: string): boolean {
  const privatePatterns = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^::1$/,
    /^localhost$/i,
    /^0\.0\.0\.0$/,
  ];
  return privatePatterns.some(pattern => pattern.test(ip));
}

// Check if IP belongs to known integration servers (ActiveCampaign, AWS, etc.)
function isIntegrationServerIp(ip: string): boolean {
  return KNOWN_INTEGRATION_SERVER_IPS.includes(ip);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 100;
    const maxBatches = body.maxBatches || 10; // Limit to avoid timeout

    console.log(`Starting backfill with batchSize=${batchSize}, maxBatches=${maxBatches}`);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let batchCount = 0;

    while (batchCount < maxBatches) {
      // Fetch leads without geolocation data but with valid IP
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('id, ip_address')
        .is('country', null)
        .not('ip_address', 'is', null)
        .limit(batchSize);

      if (fetchError) {
        console.error('Error fetching leads:', fetchError);
        throw fetchError;
      }

      if (!leads || leads.length === 0) {
        console.log('No more leads to process');
        break;
      }

      console.log(`Processing batch ${batchCount + 1} with ${leads.length} leads`);

      // Filter out private IPs and integration server IPs, get unique valid IPs
      const validLeads = leads.filter(l => 
        l.ip_address && 
        !isPrivateOrLocalIp(l.ip_address) && 
        !isIntegrationServerIp(l.ip_address)
      );
      const uniqueIps = [...new Set(validLeads.map(l => l.ip_address as string))];

      if (uniqueIps.length === 0) {
        // All IPs in this batch are private or from integration servers
        for (const lead of leads) {
          await supabase
            .from('leads')
            .update({ country: 'Não identificado' })
            .eq('id', lead.id);
        }
        totalSkipped += leads.length;
        batchCount++;
        continue;
      }

      // Lookup geolocation for unique IPs
      const geoResults = await lookupIpBatch(uniqueIps);

      // Update leads with geolocation data
      for (const lead of leads) {
        const geoData = lead.ip_address ? geoResults.get(lead.ip_address) : null;
        
        if (geoData && geoData.success) {
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              country: geoData.country,
              country_code: geoData.country_code,
              city: geoData.city,
              region: geoData.region,
            })
            .eq('id', lead.id);

          if (updateError) {
            console.error(`Error updating lead ${lead.id}:`, updateError);
          } else {
            totalUpdated++;
          }
        } else if (isPrivateOrLocalIp(lead.ip_address || '') || isIntegrationServerIp(lead.ip_address || '')) {
          // Mark private IPs or integration server IPs so they're not processed again
          await supabase
            .from('leads')
            .update({ country: 'Não identificado' })
            .eq('id', lead.id);
          totalSkipped++;
        } else {
          // IP lookup failed, mark as unknown to avoid reprocessing
          await supabase
            .from('leads')
            .update({ country: 'Não identificado' })
            .eq('id', lead.id);
          totalSkipped++;
        }
        
        totalProcessed++;
      }

      batchCount++;
      
      // Rate limiting: ip-api.com allows ~45 requests/minute for single, 15 for batch
      // Wait 4 seconds between batches to be safe
      if (batchCount < maxBatches) {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    const result = {
      success: true,
      message: `Backfill completed`,
      stats: {
        totalProcessed,
        totalUpdated,
        totalSkipped,
        batchesProcessed: batchCount,
      },
    };

    console.log('Backfill result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
