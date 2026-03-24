import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Intent mapping ---

interface IntentRule {
  keywords: string[];
  rpc: string;
  requiresFinancial: boolean;
  buildParams: (clientId: string | null, startDate: string, endDate: string) => Record<string, unknown>;
}

const INTENT_RULES: IntentRule[] = [
  {
    keywords: ["vendas", "faturamento", "receita", "revenue", "sales", "transações hotmart", "hotmart"],
    rpc: "get_transaction_stats",
    requiresFinancial: true,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e }),
  },
  {
    keywords: ["eduzz"],
    rpc: "get_eduzz_transaction_stats",
    requiresFinancial: true,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e }),
  },
  {
    keywords: ["tmb", "monetizze"],
    rpc: "get_tmb_transaction_stats",
    requiresFinancial: true,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e }),
  },
  {
    keywords: ["leads", "captação", "captura", "lead"],
    rpc: "get_lead_stats",
    requiresFinancial: false,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e }),
  },
  {
    keywords: ["top clientes", "melhores clientes", "top customers", "clientes que mais"],
    rpc: "get_top_customers",
    requiresFinancial: true,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e, p_limit: 10 }),
  },
  {
    keywords: ["tendência", "tendencia", "evolução", "evolucao", "por dia", "diário", "diario", "trend"],
    rpc: "get_sales_by_date",
    requiresFinancial: true,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e }),
  },
  {
    keywords: ["conversão", "conversao", "funil", "funnel"],
    rpc: "get_conversion_summary",
    requiresFinancial: false,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e }),
  },
  {
    keywords: ["anúncios", "anuncios", "ads", "campanhas"],
    rpc: "get_top_ads",
    requiresFinancial: false,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e, p_limit: 10 }),
  },
  {
    keywords: ["landing page", "página de captura", "pagina de captura"],
    rpc: "get_landing_page_stats",
    requiresFinancial: false,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e, p_limit: 10 }),
  },
  {
    keywords: ["resumo de leads", "summary leads"],
    rpc: "get_lead_summary_stats",
    requiresFinancial: false,
    buildParams: (cid, s, e) => ({ p_client_id: cid, p_start_date: s, p_end_date: e }),
  },
];

function matchIntent(message: string): IntentRule | null {
  const lower = message.toLowerCase();
  // Try multi-word keywords first (more specific)
  const sorted = [...INTENT_RULES].sort((a, b) => {
    const maxA = Math.max(...a.keywords.map((k) => k.split(" ").length));
    const maxB = Math.max(...b.keywords.map((k) => k.split(" ").length));
    return maxB - maxA;
  });
  for (const rule of sorted) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule;
    }
  }
  return null;
}

// --- LLM provider abstraction ---

interface LLMConfig {
  provider: string;
  apiKey: string;
}

function getLLMEndpoint(provider: string): string {
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "deepseek":
      return "https://api.deepseek.com/v1/chat/completions";
    case "grok":
      return "https://api.x.ai/v1/chat/completions";
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    default:
      return "https://api.openai.com/v1/chat/completions";
  }
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  grok: "grok-3-mini-fast",
  gemini: "gemini-2.0-flash",
};

interface ChatSettingsMap {
  modelOpenai: string;
  modelGemini: string;
  modelGrok: string;
  modelDeepseek: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  financialRoles: string[];
}

const SETTINGS_DEFAULTS: ChatSettingsMap = {
  modelOpenai: "gpt-4o-mini",
  modelGemini: "gemini-2.0-flash",
  modelGrok: "grok-3-mini-fast",
  modelDeepseek: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: `Você é o assistente de análise de vendas da plataforma Primia.
Ajude o usuário a entender seus dados de vendas, leads e marketing.
Seja conciso e direto. Use tabelas e formatação markdown quando apropriado.
Responda sempre em português (Brasil). Formate números de forma clara.
Se não tiver dados suficientes para responder, diga claramente.
Não invente dados. Use apenas os dados fornecidos no contexto.`,
  financialRoles: ["master", "admin"],
};

async function loadChatSettings(serviceClient: ReturnType<typeof createClient>): Promise<ChatSettingsMap> {
  const { data } = await serviceClient
    .from("chat_settings")
    .select("key, value");

  const settings = { ...SETTINGS_DEFAULTS };
  if (!data) return settings;

  const keyMap: Record<string, (v: string) => void> = {
    assistant_model_openai: (v) => { settings.modelOpenai = v; },
    assistant_model_gemini: (v) => { settings.modelGemini = v; },
    assistant_model_grok: (v) => { settings.modelGrok = v; },
    assistant_model_deepseek: (v) => { settings.modelDeepseek = v; },
    assistant_temperature: (v) => { settings.temperature = parseFloat(v) || 0.7; },
    assistant_max_tokens: (v) => { settings.maxTokens = parseInt(v, 10) || 2000; },
    assistant_system_prompt: (v) => { settings.systemPrompt = v; },
    assistant_financial_roles: (v) => {
      try { settings.financialRoles = JSON.parse(v); } catch { /* keep default */ }
    },
  };

  for (const row of data) {
    const setter = keyMap[row.key];
    if (setter) setter(row.value);
  }

  return settings;
}

function getModelForProvider(provider: string, settings: ChatSettingsMap): string {
  switch (provider) {
    case "openai": return settings.modelOpenai;
    case "deepseek": return settings.modelDeepseek;
    case "grok": return settings.modelGrok;
    case "gemini": return settings.modelGemini;
    default: return DEFAULT_MODELS[provider] || "gpt-4o-mini";
  }
}

function getLLMHeaders(config: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.provider === "gemini") {
    headers["x-goog-api-key"] = config.apiKey;
  } else {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  return headers;
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client (respects RLS)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client (bypasses RLS for data queries)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request
    const { message, conversation_id, client_id, date_range } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Mensagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Load chat settings from database
    const chatSettings = await loadChatSettings(serviceClient);

    // 4. Resolve access control
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = roleData?.role || "user";
    const isMaster = role === "master";

    let allowedClientId = client_id;
    // Financial access is now driven by chat_settings.assistant_financial_roles
    let canViewFinancials = chatSettings.financialRoles.includes(role);
    let clientName = "Todos os clientes";

    if (!isMaster) {
      // Verify client access
      const { data: clientUser } = await serviceClient
        .from("client_users")
        .select("client_id, can_view_financials")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!clientUser) {
        return new Response(
          JSON.stringify({ error: "Sem acesso a nenhum cliente" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Force client_id to the user's assigned client
      allowedClientId = clientUser.client_id;
      // Also respect the per-user can_view_financials flag from client_users
      if (!clientUser.can_view_financials) canViewFinancials = false;
    }

    // Get client name
    if (allowedClientId) {
      const { data: clientData } = await serviceClient
        .from("clients")
        .select("name")
        .eq("id", allowedClientId)
        .single();
      clientName = clientData?.name || "Cliente";
    }

    // 4. Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const title = message.length > 60 ? message.substring(0, 60) + "..." : message;
      const { data: newConv, error: convError } = await userClient
        .from("chat_conversations")
        .insert({ user_id: user.id, client_id: allowedClientId, title })
        .select("id")
        .single();

      if (convError || !newConv) {
        return new Response(
          JSON.stringify({ error: "Erro ao criar conversa" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      convId = newConv.id;
    }

    // 5. Load conversation history
    const { data: historyData } = await userClient
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    const history = (historyData || []).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    // 6. Save user message
    await userClient.from("chat_messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    // 7. Intent matching & data fetching
    const now = new Date();
    const startDate = date_range?.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = date_range?.end || now.toISOString();

    let dataContext = "";
    const intent = matchIntent(message);

    if (intent) {
      if (intent.requiresFinancial && !canViewFinancials) {
        // Save denial message
        const denialMsg =
          "Desculpe, você não tem permissão para acessar dados financeiros. Entre em contato com o administrador da sua conta.";
        await userClient.from("chat_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: denialMsg,
        });
        await userClient
          .from("chat_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);

        return new Response(
          JSON.stringify({ conversation_id: convId, message: denialMsg }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const params = intent.buildParams(allowedClientId, startDate, endDate);
      const { data: rpcData, error: rpcError } = await serviceClient.rpc(intent.rpc, params);

      if (!rpcError && rpcData) {
        const jsonStr = JSON.stringify(rpcData);
        // Limit data context to prevent token overflow
        dataContext = jsonStr.length > 8000 ? jsonStr.substring(0, 8000) + "..." : jsonStr;
      }
    }

    // 8. Get LLM API key
    const { data: llmIntegrations } = await serviceClient
      .from("llm_integrations")
      .select("provider, api_key")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("test_status", "success")
      .limit(1);

    if (!llmIntegrations || llmIntegrations.length === 0) {
      const noLlmMsg =
        "Nenhum provedor de IA configurado. Vá em Configurações > Integrações IA para configurar seu provedor (OpenAI, Gemini, Grok ou DeepSeek).";
      await userClient.from("chat_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: noLlmMsg,
      });

      return new Response(
        JSON.stringify({ conversation_id: convId, message: noLlmMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const llmConfig: LLMConfig = {
      provider: llmIntegrations[0].provider,
      apiKey: llmIntegrations[0].api_key,
    };

    // 9. Build system prompt from settings
    const today = now.toLocaleDateString("pt-BR");
    const financialNote = !canViewFinancials
      ? "\nIMPORTANTE: Este usuário NÃO tem permissão para ver dados financeiros (receita, valores, comissões). Não mencione valores monetários."
      : "";

    const systemPrompt = `${chatSettings.systemPrompt}

Papel do usuário: ${role}
Cliente ativo: ${clientName}${financialNote}
Data atual: ${today}`;

    // 10. Assemble messages for LLM
    const llmMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (dataContext) {
      llmMessages.push({
        role: "system",
        content: `Dados consultados do banco (RPC: ${intent?.rpc}):\n${dataContext}`,
      });
    }

    // Add conversation history
    for (const h of history) {
      llmMessages.push({ role: h.role, content: h.content });
    }

    // Add current message
    llmMessages.push({ role: "user", content: message });

    // 11. Call LLM with streaming (using settings from database)
    const llmEndpoint = getLLMEndpoint(llmConfig.provider);
    const llmModel = getModelForProvider(llmConfig.provider, chatSettings);
    const llmHeaders = getLLMHeaders(llmConfig);

    const llmResponse = await fetch(llmEndpoint, {
      method: "POST",
      headers: llmHeaders,
      body: JSON.stringify({
        model: llmModel,
        messages: llmMessages,
        stream: true,
        max_tokens: chatSettings.maxTokens,
        temperature: chatSettings.temperature,
      }),
    });

    if (!llmResponse.ok) {
      const errBody = await llmResponse.text();
      console.error(`[chat-assistant] LLM error (${llmConfig.provider}):`, errBody);
      const errorMsg = "Erro ao conectar com o provedor de IA. Verifique suas credenciais em Configurações.";
      await userClient.from("chat_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: errorMsg,
      });

      return new Response(
        JSON.stringify({ conversation_id: convId, message: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 12. Stream response back to client
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content, conversation_id: convId })}\n\n`)
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }

          // Send done event
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ done: true, conversation_id: convId })}\n\n`
            )
          );
          controller.close();

          // Save assistant message after stream completes
          await userClient.from("chat_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: fullResponse,
            metadata: { rpc: intent?.rpc || null, provider: llmConfig.provider },
          });

          await userClient
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId);
        } catch (err) {
          console.error("[chat-assistant] Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("[chat-assistant] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
