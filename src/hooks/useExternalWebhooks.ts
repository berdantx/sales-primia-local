import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ExternalWebhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  is_active: boolean;
  schedule: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDispatchLog {
  id: string;
  webhook_id: string;
  user_id: string;
  status: string;
  response_code: number | null;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateWebhookInput {
  name: string;
  url: string;
  schedule?: string | null;
}

export function useExternalWebhooks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['external-webhooks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('external_webhooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExternalWebhook[];
    },
    enabled: !!user?.id,
  });
}

export function useWebhookDispatchLogs(webhookId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['webhook-dispatch-logs', user?.id, webhookId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('webhook_dispatch_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (webhookId) {
        query = query.eq('webhook_id', webhookId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WebhookDispatchLog[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateWebhookInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('external_webhooks')
        .insert({
          user_id: user.id,
          name: input.name,
          url: input.url,
          schedule: input.schedule || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-webhooks'] });
      toast({
        title: 'Webhook criado',
        description: 'O webhook externo foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExternalWebhook> & { id: string }) => {
      const { data, error } = await supabase
        .from('external_webhooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-webhooks'] });
      toast({
        title: 'Webhook atualizado',
        description: 'O webhook foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('external_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-dispatch-logs'] });
      toast({
        title: 'Webhook excluído',
        description: 'O webhook foi excluído com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useTriggerWebhook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (webhookId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('send-sales-summary', {
        body: {
          webhook_id: webhookId,
          user_id: user.id,
          manual: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['external-webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-dispatch-logs'] });
      
      if (data?.success) {
        toast({
          title: 'Webhook disparado',
          description: 'O resumo de vendas foi enviado com sucesso.',
        });
      } else {
        toast({
          title: 'Erro no disparo',
          description: data?.error_message || 'Erro ao enviar webhook',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao disparar webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}