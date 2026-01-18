import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SalesBreakdownItem {
  category: string;
  total_transactions: number;
  total_real_brl: number;
  total_real_usd: number;
  total_projected_brl: number;
  total_projected_usd: number;
}

export interface SalesBreakdownFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
}

export function useSalesBreakdown(filters: SalesBreakdownFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'sales-breakdown',
      user?.id,
      filters.startDate?.toISOString(),
      filters.endDate?.toISOString(),
      filters.clientId,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_breakdown_by_type', {
        p_client_id: filters.clientId || null,
        p_start_date: filters.startDate?.toISOString() || null,
        p_end_date: filters.endDate?.toISOString() || null,
      });

      if (error) throw error;
      return (data as unknown as SalesBreakdownItem[]) || [];
    },
    enabled: !!user,
  });
}

export interface ProjectionStats {
  totalRealBRL: number;
  totalRealUSD: number;
  totalProjectedBRL: number;
  totalProjectedUSD: number;
  totalTransactions: number;
}

export function useProjectionStats(filters: SalesBreakdownFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'projection-stats',
      user?.id,
      filters.startDate?.toISOString(),
      filters.endDate?.toISOString(),
      filters.clientId,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_transaction_stats_with_projection', {
        p_client_id: filters.clientId || null,
        p_start_date: filters.startDate?.toISOString() || null,
        p_end_date: filters.endDate?.toISOString() || null,
      });

      if (error) throw error;
      
      const result = data as unknown as {
        total_real_brl: number;
        total_real_usd: number;
        total_projected_brl: number;
        total_projected_usd: number;
        total_transactions: number;
      };
      
      return {
        totalRealBRL: result?.total_real_brl || 0,
        totalRealUSD: result?.total_real_usd || 0,
        totalProjectedBRL: result?.total_projected_brl || 0,
        totalProjectedUSD: result?.total_projected_usd || 0,
        totalTransactions: result?.total_transactions || 0,
      } as ProjectionStats;
    },
    enabled: !!user,
  });
}
