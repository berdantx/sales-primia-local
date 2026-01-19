import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Batch lookup using ip-api.com (free API, 45 requests/minute for single, 15 for batch)
async function lookupIpBatch(ips: string[]): Promise<Map<string, GeolocationResult>> {
  const results = new Map<string, GeolocationResult>();
  
  if (ips.length === 0) {
    return results;
  }

  try {
    // ip-api.com batch endpoint (max 100 IPs per request)
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
    // Return empty results on error
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

// Single IP lookup using ip-api.com
async function lookupSingleIp(ip: string): Promise<GeolocationResult> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city`);
    
    if (!response.ok) {
      throw new Error(`IP API returned ${response.status}`);
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
      return {
        country: null,
        country_code: null,
        city: null,
        region: null,
        success: false,
        error: data.message || 'Failed to lookup IP',
      };
    }
  } catch (error) {
    console.error('Single IP lookup failed:', error);
    return {
      country: null,
      country_code: null,
      city: null,
      region: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { ip, ips } = body;

    // Batch lookup
    if (ips && Array.isArray(ips)) {
      console.log(`Batch geolocation lookup for ${ips.length} IPs`);
      const results = await lookupIpBatch(ips);
      
      // Convert Map to object for JSON response
      const resultsObject: Record<string, GeolocationResult> = {};
      results.forEach((value, key) => {
        resultsObject[key] = value;
      });

      return new Response(JSON.stringify({
        success: true,
        results: resultsObject,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single IP lookup
    if (ip) {
      console.log(`Single geolocation lookup for IP: ${ip}`);
      const result = await lookupSingleIp(ip);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Missing ip or ips parameter',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Geolocation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
