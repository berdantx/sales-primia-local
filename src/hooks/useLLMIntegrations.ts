import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type LLMProvider = 'openai' | 'gemini' | 'grok' | 'deepseek';

export interface LLMIntegration {
  id: string;
  user_id: string;
  provider: LLMProvider;
  api_key: string;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: 'success' | 'failed' | 'pending' | null;
  created_at: string;
  updated_at: string;
}

export const LLM_PROVIDERS: { id: LLMProvider; name: string; color: string; icon: string }[] = [
  { id: 'openai', name: 'OpenAI', color: 'bg-green-500', icon: '🟢' },
  { id: 'gemini', name: 'Google Gemini', color: 'bg-blue-500', icon: '🔵' },
  { id: 'grok', name: 'Grok (xAI)', color: 'bg-gray-800', icon: '⚫' },
  { id: 'deepseek', name: 'DeepSeek', color: 'bg-purple-500', icon: '🟣' },
];

export function useLLMIntegrations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['llm-integrations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('llm_integrations')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as LLMIntegration[];
    },
    enabled: !!user,
  });

  const saveIntegration = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: LLMProvider; apiKey: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const existing = integrations.find(i => i.provider === provider);
      
      if (existing) {
        const { error } = await supabase
          .from('llm_integrations')
          .update({ api_key: apiKey, test_status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('llm_integrations')
          .insert({ user_id: user.id, provider, api_key: apiKey, test_status: 'pending' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-integrations'] });
      toast.success('API key salva com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao salvar API key: ' + error.message);
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (provider: LLMProvider) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('llm_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-integrations'] });
      toast.success('Integração removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover integração: ' + error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ provider, isActive }: { provider: LLMProvider; isActive: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('llm_integrations')
        .update({ is_active: isActive })
        .eq('user_id', user.id)
        .eq('provider', provider);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-integrations'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const testConnection = useMutation({
    mutationFn: async (provider: LLMProvider) => {
      const integration = integrations.find(i => i.provider === provider);
      if (!integration) throw new Error('Integração não encontrada');

      const { data, error } = await supabase.functions.invoke('test-llm-connection', {
        body: { provider, api_key: integration.api_key },
      });

      if (error) throw error;
      
      // Update test status
      await supabase
        .from('llm_integrations')
        .update({ 
          test_status: data.success ? 'success' : 'failed',
          last_tested_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['llm-integrations'] });
      if (data.success) {
        toast.success('Conexão válida!');
      } else {
        toast.error('Falha na conexão: ' + (data.error || 'API key inválida'));
      }
    },
    onError: (error) => {
      toast.error('Erro ao testar conexão: ' + error.message);
    },
  });

  const getIntegration = (provider: LLMProvider) => {
    return integrations.find(i => i.provider === provider);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  return {
    integrations,
    isLoading,
    saveIntegration,
    deleteIntegration,
    toggleActive,
    testConnection,
    getIntegration,
    maskApiKey,
  };
}
