import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching dollar rate from AwesomeAPI...');
    
    // Fetch USD-BRL rate from AwesomeAPI (free, no API key required)
    const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    
    if (!response.ok) {
      throw new Error(`AwesomeAPI returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.USDBRL) {
      throw new Error('Invalid response format from AwesomeAPI');
    }
    
    const rate = parseFloat(data.USDBRL.bid);
    const timestamp = new Date().toISOString();
    
    console.log(`Dollar rate fetched successfully: R$ ${rate.toFixed(4)}`);
    
    return new Response(
      JSON.stringify({
        rate,
        ask: parseFloat(data.USDBRL.ask),
        high: parseFloat(data.USDBRL.high),
        low: parseFloat(data.USDBRL.low),
        source: 'AwesomeAPI',
        timestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dollar rate';
    console.error('Error fetching dollar rate:', errorMessage);
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
