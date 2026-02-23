import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LeadSummaryStats {
  total: number;
  byTrafficType: Record<string, number>;
}

export interface LeadSummaryFilters {
  clientId?: string | null;
  startDate?: Date;
  endDate?: Date;
}

export function useLeadSummaryStats(filters?: LeadSummaryFilters) {
  const { user } = useAuth();

  const filterKey = filters ? {
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    clientId: filters.clientId,
  } : null;

  return useQuery({
    queryKey: ['lead-summary-stats', user?.id, filterKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lead_summary_stats', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) throw error;

      const result = data as unknown as {
        total: number;
        by_traffic_type: Record<string, number>;
      };

      return {
        total: result?.total || 0,
        byTrafficType: result?.by_traffic_type || {},
      } as LeadSummaryStats;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
