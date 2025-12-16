import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Try to fetch from AwesomeAPI
async function fetchFromAwesomeAPI(): Promise<{ rate: number; source: string } | null> {
  try {
    console.log('Trying AwesomeAPI...');
    const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    
    if (!response.ok) {
      console.log(`AwesomeAPI returned status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (!data.USDBRL) return null;
    
    return {
      rate: parseFloat(data.USDBRL.bid),
      source: 'AwesomeAPI',
    };
  } catch (error) {
    console.log('AwesomeAPI error:', error);
    return null;
  }
}

// Fallback: Fetch from Banco Central do Brasil (BCB)
async function fetchFromBCB(): Promise<{ rate: number; source: string } | null> {
  try {
    console.log('Trying BCB API...');
    // Get today's date in MM-DD-YYYY format for BCB
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`;
    
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$format=json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`BCB API returned status ${response.status}`);
      // Try previous business day if today has no data
      return await fetchFromBCBPreviousDays();
    }
    
    const data = await response.json();
    
    if (data.value && data.value.length > 0) {
      // Get the last (most recent) rate of the day
      const lastRate = data.value[data.value.length - 1];
      return {
        rate: lastRate.cotacaoCompra,
        source: 'BCB',
      };
    }
    
    // No data for today, try previous days
    return await fetchFromBCBPreviousDays();
  } catch (error) {
    console.log('BCB API error:', error);
    return null;
  }
}

// Try to get BCB data from previous business days
async function fetchFromBCBPreviousDays(): Promise<{ rate: number; source: string } | null> {
  for (let daysBack = 1; daysBack <= 5; daysBack++) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
      
      const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$format=json`;
      
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.value && data.value.length > 0) {
        const lastRate = data.value[data.value.length - 1];
        console.log(`Found BCB rate from ${daysBack} day(s) ago`);
        return {
          rate: lastRate.cotacaoCompra,
          source: 'BCB',
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching dollar rate...');
    
    // Try AwesomeAPI first (more up-to-date)
    let result = await fetchFromAwesomeAPI();
    
    // Fallback to BCB if AwesomeAPI fails
    if (!result) {
      console.log('AwesomeAPI failed, trying BCB...');
      result = await fetchFromBCB();
    }
    
    // If both fail, return a fallback rate
    if (!result) {
      console.log('All APIs failed, using fallback rate');
      result = {
        rate: 6.10, // Approximate fallback rate
        source: 'fallback',
      };
    }
    
    const timestamp = new Date().toISOString();
    
    console.log(`Dollar rate fetched successfully: R$ ${result.rate.toFixed(4)} (source: ${result.source})`);
    
    return new Response(
      JSON.stringify({
        rate: result.rate,
        source: result.source,
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
    
    // Even on error, return a fallback rate so the UI doesn't break
    return new Response(
      JSON.stringify({
        rate: 6.10,
        source: 'fallback',
        timestamp: new Date().toISOString(),
        warning: 'Using fallback rate due to API errors',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
