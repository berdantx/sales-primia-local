import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  provider: 'openai' | 'gemini' | 'grok' | 'deepseek';
  api_key: string;
}

async function testOpenAI(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (response.ok) {
      return { success: true };
    }
    
    const error = await response.json();
    return { success: false, error: error.error?.message || 'API key inválida' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

async function testGemini(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    
    if (response.ok) {
      return { success: true };
    }
    
    const error = await response.json();
    return { success: false, error: error.error?.message || 'API key inválida' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

async function testGrok(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.x.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (response.ok) {
      return { success: true };
    }
    
    const error = await response.json();
    return { success: false, error: error.error?.message || 'API key inválida' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

async function testDeepSeek(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (response.ok) {
      return { success: true };
    }
    
    const error = await response.json();
    return { success: false, error: error.error?.message || 'API key inválida' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, api_key }: TestRequest = await req.json();

    if (!provider || !api_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provider e api_key são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[test-llm-connection] Testing ${provider} connection...`);

    let result: { success: boolean; error?: string };

    switch (provider) {
      case 'openai':
        result = await testOpenAI(api_key);
        break;
      case 'gemini':
        result = await testGemini(api_key);
        break;
      case 'grok':
        result = await testGrok(api_key);
        break;
      case 'deepseek':
        result = await testDeepSeek(api_key);
        break;
      default:
        result = { success: false, error: 'Provider não suportado' };
    }

    console.log(`[test-llm-connection] ${provider} result:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[test-llm-connection] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
