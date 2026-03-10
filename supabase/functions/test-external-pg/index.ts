import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const host = Deno.env.get('EXTERNAL_PG_HOST');
    const port = Deno.env.get('EXTERNAL_PG_PORT');
    const database = Deno.env.get('EXTERNAL_PG_DATABASE');
    const user = Deno.env.get('EXTERNAL_PG_USER');
    const password = Deno.env.get('EXTERNAL_PG_PASSWORD');

    if (!host || !port || !database || !user || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais do PostgreSQL externo não configuradas. Verifique os secrets.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[test-external-pg] Connecting to ${host}:${port}/${database}...`);

    const client = new Client({
      hostname: host,
      port: parseInt(port),
      database,
      user,
      password,
      tls: { enabled: false },
      connection: { attempts: 1 },
    });

    // Set a manual timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: conexão não estabelecida em 15s')), 15000)
    );

    await Promise.race([client.connect(), timeoutPromise]);

    // Test basic connectivity
    const selectResult = await client.queryObject<{ result: number }>('SELECT 1 AS result');
    const versionResult = await client.queryObject<{ version: string }>('SELECT version()');

    const responseTime = Date.now() - start;
    const pgVersion = versionResult.rows[0]?.version || 'unknown';

    await client.end();

    console.log(`[test-external-pg] Success in ${responseTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        responseTime,
        pgVersion,
        selectOk: selectResult.rows[0]?.result === 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const responseTime = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[test-external-pg] Error after ${responseTime}ms:`, message);

    return new Response(
      JSON.stringify({
        success: false,
        responseTime,
        error: message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
