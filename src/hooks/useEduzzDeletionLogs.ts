import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EduzzDeletionLog {
  id: string;
  transaction_id: string;
  sale_id: string;
  client_id: string;
  deleted_by: string;
  justification: string;
  transaction_data: Record<string, any>;
  created_at: string;
  deleted_by_name?: string;
}

export interface EduzzDeletionLogFilters {
  startDate?: Date;
  endDate?: Date;
  search?: string;
  clientId?: string | null;
}

export function useEduzzDeletionLogs(filters?: EduzzDeletionLogFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['eduzz-deletion-logs', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('eduzz_transaction_deletion_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch profile names for deleted_by users
      const userIds = [...new Set(data.map(d => d.deleted_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      let logs: EduzzDeletionLog[] = data.map(d => ({
        ...d,
        transaction_data: d.transaction_data as Record<string, any>,
        deleted_by_name: profileMap.get(d.deleted_by) || 'Usuário desconhecido',
      }));

      // Client-side search filter on transaction_data fields
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        logs = logs.filter(log => {
          const td = log.transaction_data;
          return (
            log.sale_id.toLowerCase().includes(s) ||
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
