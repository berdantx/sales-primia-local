import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TmbDeletionLog {
  id: string;
  transaction_id: string;
  transaction_identifier: string;
  client_id: string;
  deleted_by: string;
  justification: string;
  transaction_data: Record<string, any>;
  audit_type: string;
  created_at: string;
  deleted_by_name?: string;
}

export interface TmbDeletionLogFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
  clientId?: string | null;
}

export function useTmbDeletionLogs(filters?: TmbDeletionLogFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tmb-deletion-logs', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('duplicate_deletion_logs')
        .select('*')
        .eq('platform', 'tmb')
        .order('created_at', { ascending: false });

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch profile names
      const userIds = [...new Set(data.map(d => d.deleted_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      let logs: TmbDeletionLog[] = data.map(d => ({
        ...d,
        transaction_data: d.transaction_data as Record<string, any>,
        deleted_by_name: profileMap.get(d.deleted_by) || 'Usuário desconhecido',
      }));

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        logs = logs.filter(log => {
          const td = log.transaction_data;
          return (
            log.transaction_identifier.toLowerCase().includes(s) ||
            (td.product && String(td.product).toLowerCase().includes(s)) ||
            (td.buyer_name && String(td.buyer_name).toLowerCase().includes(s)) ||
            (td.buyer_email && String(td.buyer_email).toLowerCase().includes(s)) ||
            log.justification.toLowerCase().includes(s)
          );
        });
      }

      return logs;
    },
    enabled: !!user,
  });
}
