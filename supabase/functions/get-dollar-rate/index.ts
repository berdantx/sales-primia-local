import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// 1. AwesomeAPI
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
    return { rate: parseFloat(data.USDBRL.bid), source: 'AwesomeAPI' };
  } catch (error) {
    console.log('AwesomeAPI error:', error);
    return null;
  }
}

// 2. BCB
async function fetchFromBCB(): Promise<{ rate: number; source: string } | null> {
  try {
    console.log('Trying BCB API...');
    for (let daysBack = 0; daysBack <= 5; daysBack++) {
      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
      const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$format=json`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (data.value && data.value.length > 0) {
        const lastRate = data.value[data.value.length - 1];
        if (daysBack > 0) console.log(`Found BCB rate from ${daysBack} day(s) ago`);
        return { rate: lastRate.cotacaoCompra, source: 'BCB' };
      }
    }
    return null;
  } catch (error) {
    console.log('BCB API error:', error);
    return null;
  }
}

// 3. ExchangeRate API
async function fetchFromExchangeRate(): Promise<{ rate: number; source: string } | null> {
  try {
    console.log('Trying ExchangeRate API...');
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      console.log(`ExchangeRate API returned status ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.rates?.BRL) {
      return { rate: data.rates.BRL, source: 'ExchangeRate' };
    }
    return null;
  } catch (error) {
    console.log('ExchangeRate API error:', error);
    return null;
  }
}

// 4. Frankfurter API
async function fetchFromFrankfurter(): Promise<{ rate: number; source: string } | null> {
  try {
    console.log('Trying Frankfurter API...');
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=BRL');
    if (!response.ok) {
      console.log(`Frankfurter API returned status ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.rates?.BRL) {
      return { rate: data.rates.BRL, source: 'Frankfurter' };
    }
    return null;
  } catch (error) {
    console.log('Frankfurter API error:', error);
    return null;
  }
}

// Read cached rate from DB
async function getCachedRate(): Promise<{ rate: number; source: string; fetched_at: string } | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('dollar_rate_cache')
      .select('rate, source, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return { rate: Number(data.rate), source: data.source, fetched_at: data.fetched_at };
  } catch {
    return null;
  }
}

// Save rate to DB cache
async function saveRateToCache(rate: number, source: string) {
  try {
    const supabase = getSupabaseAdmin();
    // Keep only the latest entry
    await supabase.from('dollar_rate_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('dollar_rate_cache').insert({ rate, source });
  } catch (error) {
    console.log('Failed to save rate to cache:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching dollar rate...');

    // Try all APIs in sequence
    let result = await fetchFromAwesomeAPI();
    if (!result) {
      console.log('AwesomeAPI failed, trying BCB...');
      result = await fetchFromBCB();
    }
    if (!result) {
      console.log('BCB failed, trying ExchangeRate...');
      result = await fetchFromExchangeRate();
    }
    if (!result) {
      console.log('ExchangeRate failed, trying Frankfurter...');
      result = await fetchFromFrankfurter();
    }

    // If got a real rate, cache it
    if (result) {
      saveRateToCache(result.rate, result.source); // fire and forget
    }

    // If all APIs failed, try DB cache
    let warning: string | undefined;
    if (!result) {
      console.log('All APIs failed, trying DB cache...');
      const cached = await getCachedRate();
      if (cached) {
        console.log(`Using cached rate from ${cached.fetched_at}: R$ ${cached.rate}`);
        result = { rate: cached.rate, source: `cache (${cached.source})` };
        warning = `Usando cotação em cache de ${new Date(cached.fetched_at).toLocaleDateString('pt-BR')}`;
      }
    }

    // Last resort: static fallback
    if (!result) {
      console.log('All sources failed, using static fallback');
      result = { rate: 5.70, source: 'fallback' };
      warning = 'Usando cotação aproximada (fallback estático)';
    }

    console.log(`Dollar rate: R$ ${result.rate.toFixed(4)} (source: ${result.source})`);

    return new Response(
      JSON.stringify({
        rate: result.rate,
        source: result.source,
        timestamp: new Date().toISOString(),
        ...(warning ? { warning } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dollar rate';
    console.error('Error fetching dollar rate:', errorMessage);

    return new Response(
      JSON.stringify({
        rate: 5.70,
        source: 'fallback',
        timestamp: new Date().toISOString(),
        warning: 'Usando cotação aproximada devido a erros nas APIs',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
