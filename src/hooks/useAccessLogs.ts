import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AccessLog {
  id: string;
  user_id: string | null;
  email: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useAccessLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['access-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AccessLog[];
    },
  });

  return { logs, isLoading };
}

export function useForceLogout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const forceLogoutMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.functions.invoke('force-logout', {
        body: { target_user_id: targetUserId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Usuário desconectado',
        description: data.message || 'O usuário foi desconectado de todas as sessões.',
      });
      queryClient.invalidateQueries({ queryKey: ['access-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao desconectar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    forceLogout: forceLogoutMutation.mutate,
    isLoggingOut: forceLogoutMutation.isPending,
  };
}
