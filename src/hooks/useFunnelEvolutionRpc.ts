import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface FunnelDataPoint {
  date: string;
  totalLeads: number;
  qualifiedLeads: number;
  qualificationRate: number;
  convertedLeads: number;
  conversionRate: number;
  qualifiedConversionRate: number;
}

interface UseFunnelEvolutionRpcProps {
  clientId?: string | null;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week';
}

export function useFunnelEvolutionRpc({
  clientId,
  startDate,
  endDate,
  groupBy = 'day',
}: UseFunnelEvolutionRpcProps) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['funnel-evolution-rpc', user?.id, clientId, startDate?.toISOString(), endDate?.toISOString(), groupBy],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_funnel_evolution', {
        p_client_id: clientId || null,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
        p_group_by: groupBy,
      });

      if (error) throw error;
      // RPC returns json (could be array or wrapped)
      const result = data as unknown;
      if (Array.isArray(result)) return result as FunnelDataPoint[];
      return [];
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
