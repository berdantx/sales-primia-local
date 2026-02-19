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

      // Fetch from eduzz_transaction_deletion_logs
      let query1 = supabase
        .from('eduzz_transaction_deletion_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.clientId) query1 = query1.eq('client_id', filters.clientId);
      if (filters?.startDate) query1 = query1.gte('created_at', filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
      if (filters?.endDate) query1 = query1.lte('created_at', filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);

      // Fetch from duplicate_deletion_logs (platform=eduzz)
      let query2 = supabase
        .from('duplicate_deletion_logs')
        .select('*')
        .eq('platform', 'eduzz')
        .order('created_at', { ascending: false });

      if (filters?.clientId) query2 = query2.eq('client_id', filters.clientId);
      if (filters?.startDate) query2 = query2.gte('created_at', filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
      if (filters?.endDate) query2 = query2.lte('created_at', filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);

      const [res1, res2] = await Promise.all([query1, query2]);
      if (res1.error) throw res1.error;
      if (res2.error) throw res2.error;

      // Deduplicate by transaction_id (eduzz_transaction_deletion_logs takes priority)
      const seenTxIds = new Set((res1.data || []).map(d => d.transaction_id));

      // Collect all user IDs for profile lookup
      const allData1 = res1.data || [];
      const allData2 = (res2.data || []).filter(d => !seenTxIds.has(d.transaction_id));
      const allUserIds = [...new Set([...allData1.map(d => d.deleted_by), ...allData2.map(d => d.deleted_by)])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const logs1: EduzzDeletionLog[] = allData1.map(d => ({
        ...d,
        transaction_data: d.transaction_data as Record<string, any>,
        deleted_by_name: profileMap.get(d.deleted_by) || 'Usuário desconhecido',
      }));

      const logs2: EduzzDeletionLog[] = allData2.map(d => ({
        id: d.id,
        transaction_id: d.transaction_id,
        sale_id: d.transaction_identifier,
        client_id: d.client_id,
        deleted_by: d.deleted_by,
        justification: d.justification,
        transaction_data: d.transaction_data as Record<string, any>,
        created_at: d.created_at,
        deleted_by_name: profileMap.get(d.deleted_by) || 'Usuário desconhecido',
      }));

      let logs = [...logs1, ...logs2].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
