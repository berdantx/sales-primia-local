import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ChatSettings {
  modelOpenai: string;
  modelGemini: string;
  modelGrok: string;
  modelDeepseek: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  financialRoles: string[];
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  modelOpenai: 'gpt-4o-mini',
  modelGemini: 'gemini-2.0-flash',
  modelGrok: 'grok-3-mini-fast',
  modelDeepseek: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: `Você é o assistente de análise de vendas da plataforma Primia.
Ajude o usuário a entender seus dados de vendas, leads e marketing.
Seja conciso e direto. Responda sempre em português (Brasil).

REGRAS DE FORMATAÇÃO (siga rigorosamente):
- NUNCA use tabelas markdown (| coluna |). Tabelas são PROIBIDAS.
- Use este formato para dados:
  *Campo:* valor
  *Campo:* valor
- Use **negrito** para valores numéricos importantes.
- Formate números com separadores brasileiros (ex: R$ 1.234,56).
- Termine com um *Resumo:* de 1 frase quando relevante.
- Mantenha respostas curtas (máximo 3-4 parágrafos).
- Não invente dados. Use apenas os dados fornecidos no contexto.`,
  financialRoles: ['master', 'admin'],
};

const SETTINGS_KEYS = [
  'assistant_model_openai',
  'assistant_model_gemini',
  'assistant_model_grok',
  'assistant_model_deepseek',
  'assistant_temperature',
  'assistant_max_tokens',
  'assistant_system_prompt',
  'assistant_financial_roles',
] as const;

type SettingKey = typeof SETTINGS_KEYS[number];

const KEY_TO_PROP: Record<SettingKey, keyof ChatSettings> = {
  assistant_model_openai: 'modelOpenai',
  assistant_model_gemini: 'modelGemini',
  assistant_model_grok: 'modelGrok',
  assistant_model_deepseek: 'modelDeepseek',
  assistant_temperature: 'temperature',
  assistant_max_tokens: 'maxTokens',
  assistant_system_prompt: 'systemPrompt',
  assistant_financial_roles: 'financialRoles',
};

const PROP_TO_KEY: Record<keyof ChatSettings, SettingKey> = {
  modelOpenai: 'assistant_model_openai',
  modelGemini: 'assistant_model_gemini',
  modelGrok: 'assistant_model_grok',
  modelDeepseek: 'assistant_model_deepseek',
  temperature: 'assistant_temperature',
  maxTokens: 'assistant_max_tokens',
  systemPrompt: 'assistant_system_prompt',
  financialRoles: 'assistant_financial_roles',
};

export const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  grok: [
    { value: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast' },
    { value: 'grok-3', label: 'Grok 3' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
};

export function useChatSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_CHAT_SETTINGS, isLoading } = useQuery({
    queryKey: ['chat-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_settings')
        .select('key, value')
        .in('key', SETTINGS_KEYS as unknown as string[]);

      if (error) throw error;

      const result = { ...DEFAULT_CHAT_SETTINGS };

      data?.forEach((row: { key: string; value: string }) => {
        const prop = KEY_TO_PROP[row.key as SettingKey];
        if (!prop) return;

        if (prop === 'temperature') {
          result.temperature = parseFloat(row.value) || DEFAULT_CHAT_SETTINGS.temperature;
        } else if (prop === 'maxTokens') {
          result.maxTokens = parseInt(row.value, 10) || DEFAULT_CHAT_SETTINGS.maxTokens;
        } else if (prop === 'financialRoles') {
          try {
            result.financialRoles = JSON.parse(row.value);
          } catch {
            result.financialRoles = DEFAULT_CHAT_SETTINGS.financialRoles;
          }
        } else {
          (result as Record<string, unknown>)[prop] = row.value;
        }
      });

      return result;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<ChatSettings>) => {
      for (const [property, value] of Object.entries(newSettings)) {
        const key = PROP_TO_KEY[property as keyof ChatSettings];
        if (!key) continue;

        let stringValue: string;
        if (Array.isArray(value)) {
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        const { error } = await supabase
          .from('chat_settings')
          .upsert(
            { key, value: stringValue, updated_at: new Date().toISOString(), updated_by: user?.id },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-settings'] });
      toast.success('Configurações do assistente salvas!');
    },
    onError: (error) => {
      console.error('Error saving chat settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  const clearAllConversations = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');

      // Delete all conversations (cascade deletes messages)
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .not('id', 'is', null); // delete all rows accessible by RLS

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      toast.success('Histórico de conversas limpo!');
    },
    onError: (error) => {
      toast.error('Erro ao limpar histórico: ' + (error as Error).message);
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    clearAllConversations: clearAllConversations.mutate,
    isClearingHistory: clearAllConversations.isPending,
  };
}
