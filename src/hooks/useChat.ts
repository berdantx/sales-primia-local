import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFilter } from '@/contexts/FilterContext';
import { useAuth } from '@/hooks/useAuth';
import { useChatHistory } from '@/hooks/useChatHistory';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// --- Intent mapping ---

interface IntentRule {
  keywords: string[];
  rpc: string;
  requiresFinancial: boolean;
}

const INTENT_RULES: IntentRule[] = [
  { keywords: ['hotmart'], rpc: 'get_transaction_stats', requiresFinancial: true },
  { keywords: ['eduzz'], rpc: 'get_eduzz_transaction_stats', requiresFinancial: true },
  { keywords: ['tmb', 'monetizze'], rpc: 'get_tmb_transaction_stats', requiresFinancial: true },
  { keywords: ['vendas', 'venda', 'faturamento', 'faturou', 'receita', 'revenue', 'sales', 'transação', 'transações', 'transacao', 'transacoes', 'quanto vendeu', 'última venda', 'ultima venda', 'valor das vendas'], rpc: '_all_transaction_stats', requiresFinancial: true },
  { keywords: ['leads', 'captação', 'captacao', 'captura', 'lead', 'cadastro', 'cadastros'], rpc: 'get_lead_stats', requiresFinancial: false },
  { keywords: ['top clientes', 'melhores clientes', 'top customers', 'clientes que mais', 'maiores compradores'], rpc: 'get_top_customers', requiresFinancial: true },
  { keywords: ['tendência', 'tendencia', 'evolução', 'evolucao', 'por dia', 'diário', 'diario', 'trend', 'crescimento'], rpc: 'get_sales_by_date', requiresFinancial: true },
  { keywords: ['conversão', 'conversao', 'funil', 'funnel', 'taxa de conversão'], rpc: 'get_conversion_summary', requiresFinancial: false },
  { keywords: ['anúncios', 'anuncios', 'ads', 'campanhas', 'campanha', 'tráfego pago', 'trafego pago'], rpc: 'get_top_ads', requiresFinancial: false },
  { keywords: ['landing page', 'página de captura', 'pagina de captura', 'lp'], rpc: 'get_landing_page_stats', requiresFinancial: false },
  { keywords: ['resumo de leads', 'summary leads', 'resumo leads'], rpc: 'get_lead_summary_stats', requiresFinancial: false },
];

function matchIntent(message: string): IntentRule | null {
  const lower = message.toLowerCase();
  const sorted = [...INTENT_RULES].sort((a, b) => {
    const maxA = Math.max(...a.keywords.map((k) => k.split(' ').length));
    const maxB = Math.max(...b.keywords.map((k) => k.split(' ').length));
    return maxB - maxA;
  });
  for (const rule of sorted) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule;
    }
  }
  return null;
}

// --- LLM provider config ---

function getLLMEndpoint(provider: string): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1/chat/completions';
    case 'deepseek': return 'https://api.deepseek.com/v1/chat/completions';
    case 'grok': return 'https://api.x.ai/v1/chat/completions';
    case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    default: return 'https://api.openai.com/v1/chat/completions';
  }
}

function getLLMHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider === 'gemini') {
    headers['x-goog-api-key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  grok: 'grok-3-mini-fast',
  gemini: 'gemini-2.0-flash',
};

// --- Main hook ---

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { clientId } = useFilter();
  const { user } = useAuth();
  const { invalidate } = useChatHistory();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !user) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 1. Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const role = roleData?.role || 'user';
      const isMaster = role === 'master';

      // 2. Resolve client access
      let allowedClientId = clientId;
      let clientName = 'Todos os clientes';

      if (!isMaster) {
        const { data: clientUser } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (clientUser) allowedClientId = clientUser.client_id;
      }

      if (allowedClientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', allowedClientId)
          .single();
        clientName = clientData?.name || 'Cliente';
      }

      // 3. Load chat settings
      const { data: settingsData } = await supabase
        .from('chat_settings')
        .select('key, value');

      const settings: Record<string, string> = {};
      settingsData?.forEach((row) => { settings[row.key] = row.value; });

      const temperature = parseFloat(settings['assistant_temperature'] || '0.7');
      const maxTokens = parseInt(settings['assistant_max_tokens'] || '2000', 10);
      const systemPromptBase = settings['assistant_system_prompt'] ||
        'Você é o assistente de análise de vendas da plataforma Primia. Responda em português (Brasil). Seja conciso. NUNCA use tabelas markdown. Use o formato *Campo:* valor para dados. Use **negrito** para números. Mantenha respostas curtas.';

      let financialRoles: string[] = ['master', 'admin'];
      try { financialRoles = JSON.parse(settings['assistant_financial_roles'] || '["master","admin"]'); } catch { /* default */ }

      const canViewFinancials = financialRoles.includes(role);

      // 4. Get or create conversation
      let convId = conversationId;
      if (!convId) {
        const title = content.trim().length > 60 ? content.trim().substring(0, 60) + '...' : content.trim();
        const { data: newConv, error: convError } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, client_id: allowedClientId, title })
          .select('id')
          .single();

        if (convError || !newConv) throw new Error('Erro ao criar conversa');
        convId = newConv.id;
        setConversationId(convId);
      }

      // 5. Load conversation history
      const { data: historyData } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(20);

      const history = (historyData || []).map((m) => ({ role: m.role, content: m.content }));

      // 6. Save user message
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: content.trim(),
      });

      // 7. Intent matching & data fetching
      const now = new Date();
      // Default: fetch ALL data (no date limit), matching dashboard "Tudo" filter
      const startDate = new Date(2020, 0, 1).toISOString();
      const endDate = new Date(now.getFullYear() + 1, 0, 1).toISOString();

      let dataContext = '';
      const intent = matchIntent(content);

      console.log('[chat] intent:', intent?.rpc, '| clientId:', allowedClientId, '| range:', startDate, '->', endDate);

      if (intent) {
        if (intent.requiresFinancial && !canViewFinancials) {
          const denialMsg = 'Desculpe, você não tem permissão para acessar dados financeiros. Entre em contato com o administrador da sua conta.';
          await supabase.from('chat_messages').insert({ conversation_id: convId, role: 'assistant', content: denialMsg });
          await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);

          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: denialMsg, created_at: new Date().toISOString() }]);
          invalidate();
          return;
        }

        const params: Record<string, unknown> = { p_client_id: allowedClientId, p_start_date: startDate, p_end_date: endDate };
        if (intent.rpc === 'get_top_customers' || intent.rpc === 'get_top_ads' || intent.rpc === 'get_landing_page_stats') {
          params.p_limit = 10;
        }

        console.log('[chat] calling RPC with params:', JSON.stringify(params));

        if (intent.rpc === '_all_transaction_stats') {
          // Fetch from ALL platforms in parallel (including CIS PAY)
          const [hotmart, eduzz, tmb, cispay] = await Promise.all([
            supabase.rpc('get_transaction_stats' as any, params as any),
            supabase.rpc('get_eduzz_transaction_stats' as any, params as any),
            supabase.rpc('get_tmb_transaction_stats' as any, params as any),
            supabase.rpc('get_cispay_transaction_stats' as any, params as any),
          ]);

          const allData: Record<string, unknown> = {};
          if (hotmart.data) allData.hotmart = hotmart.data;
          if (eduzz.data) allData.eduzz = eduzz.data;
          if (tmb.data) allData.tmb = tmb.data;
          if (cispay.data) allData.cispay = cispay.data;

          const jsonStr = JSON.stringify(allData);
          dataContext = jsonStr.length > 8000 ? jsonStr.substring(0, 8000) + '...' : jsonStr;
        } else {
          const { data: rpcData, error: rpcError } = await supabase.rpc(intent.rpc as any, params as any);
          console.log('[chat] RPC result:', intent.rpc, '| data:', rpcData, '| error:', rpcError);
          if (!rpcError && rpcData) {
            const jsonStr = JSON.stringify(rpcData);
            dataContext = jsonStr.length > 8000 ? jsonStr.substring(0, 8000) + '...' : jsonStr;
          }
        }
      }

      // 7b. Get dollar rate for USD conversion context
      let dollarRate = 5.0; // fallback
      const { data: rateData } = await supabase
        .from('dollar_rate_cache')
        .select('rate')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();
      if (rateData?.rate) dollarRate = rateData.rate;

      // Add dollar rate to data context so LLM can convert
      if (dataContext) {
        dataContext += `\n\nCotação do dólar atual: R$ ${dollarRate.toFixed(2)}. IMPORTANTE: Sempre converta valores em USD para BRL usando essa cotação e some ao total em BRL para mostrar o faturamento consolidado.`;
      }

      // 8. Get LLM API key
      const { data: llmIntegrations } = await supabase
        .from('llm_integrations')
        .select('provider, api_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('test_status', 'success')
        .limit(1);

      if (!llmIntegrations || llmIntegrations.length === 0) {
        const noLlmMsg = 'Nenhum provedor de IA configurado. Vá em Configurações > Integrações IA para configurar seu provedor.';
        await supabase.from('chat_messages').insert({ conversation_id: convId, role: 'assistant', content: noLlmMsg });

        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: noLlmMsg, created_at: new Date().toISOString() }]);
        invalidate();
        return;
      }

      const provider = llmIntegrations[0].provider;
      const apiKey = llmIntegrations[0].api_key;

      // 9. Build system prompt
      const today = now.toLocaleDateString('pt-BR');
      const financialNote = !canViewFinancials
        ? '\nIMPORTANTE: Este usuário NÃO tem permissão para ver dados financeiros. Não mencione valores monetários.'
        : '';

      const systemPrompt = `${systemPromptBase}\n\nPapel do usuário: ${role}\nCliente ativo: ${clientName}${financialNote}\nData atual: ${today}`;

      // 10. Assemble messages for LLM
      const llmMessages: { role: string; content: string }[] = [
        { role: 'system', content: systemPrompt },
      ];

      if (dataContext) {
        llmMessages.push({ role: 'system', content: `Dados consultados do banco (RPC: ${intent?.rpc}):\n${dataContext}` });
      }

      for (const h of history) {
        llmMessages.push({ role: h.role, content: h.content });
      }
      llmMessages.push({ role: 'user', content: content.trim() });

      // 11. Resolve model from settings
      const modelKey = `assistant_model_${provider}`;
      const model = settings[modelKey] || DEFAULT_MODELS[provider] || 'gpt-4o-mini';

      // 12. Call LLM with streaming
      const abortController = new AbortController();
      abortRef.current = abortController;

      const llmResponse = await fetch(getLLMEndpoint(provider), {
        method: 'POST',
        headers: getLLMHeaders(provider, apiKey),
        body: JSON.stringify({
          model,
          messages: llmMessages,
          stream: true,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: abortController.signal,
      });

      if (!llmResponse.ok) {
        const errBody = await llmResponse.text();
        console.error(`[chat] LLM error (${provider}):`, errBody);
        throw new Error('Erro ao conectar com o provedor de IA. Verifique suas credenciais em Configurações.');
      }

      // 13. Stream response
      setIsStreaming(true);
      const assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', created_at: new Date().toISOString() }]);

      const reader = llmResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              fullResponse += chunk;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m)
              );
            }
          } catch { /* skip */ }
        }
      }

      setIsStreaming(false);

      // 14. Save assistant message
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: fullResponse,
        metadata: { rpc: intent?.rpc || null, provider },
      });

      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
      invalidate();

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [conversationId, clientId, isLoading, user, invalidate]);

  const loadConversation = useCallback(async (convId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []).map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        created_at: m.created_at,
      })));
      setConversationId(convId);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, []);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  return {
    messages, conversationId, isLoading, isStreaming,
    sendMessage, loadConversation, startNewConversation, stopStreaming,
  };
}
