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

export interface AccessLogsFilters {
  email?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export function useAccessLogs(
  filters: AccessLogsFilters = {},
  pagination: PaginationState = { page: 0, pageSize: 20 }
) {
  const { data, isLoading } = useQuery({
    queryKey: ['access-logs', filters, pagination],
    queryFn: async () => {
      let query = supabase
        .from('access_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        // Add 1 day to include the entire end date
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      // Apply pagination
      const from = pagination.page * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data as AccessLog[], totalCount: count || 0 };
    },
  });

  return { 
    logs: data?.logs, 
    totalCount: data?.totalCount || 0,
    isLoading 
  };
}

export function useUniqueEmails() {
  const { data: emails } = useQuery({
    queryKey: ['access-logs-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('email')
        .not('email', 'is', null)
        .order('email');

      if (error) throw error;
      
      // Get unique emails
      const uniqueEmails = [...new Set(data.map(d => d.email).filter(Boolean))];
      return uniqueEmails as string[];
    },
  });

  return emails || [];
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

export function useDeleteUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { target_user_id: targetUserId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Usuário excluído',
        description: data.message || 'O usuário foi excluído permanentemente.',
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['access-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    deleteUser: deleteUserMutation.mutate,
    isDeleting: deleteUserMutation.isPending,
  };
}
