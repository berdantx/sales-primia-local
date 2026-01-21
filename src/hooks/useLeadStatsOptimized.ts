import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LeadStatsOptimized {
  total: number;
  bySource: Record<string, number>;
  byUtmSource: Record<string, number>;
  byDay: Record<string, number>;
  byCountry: Record<string, number>;
  byCity: Record<string, number>;
}

export interface LeadStatsFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
}

export function useLeadStatsOptimized(filters?: LeadStatsFilters) {
  const { user } = useAuth();

  const filterKey = filters ? {
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    clientId: filters.clientId,
  } : null;

  return useQuery({
    queryKey: ['lead-stats-optimized', user?.id, filterKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lead_stats', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) throw error;

      // Transform the response to match our interface
      const result = data as {
        total: number;
        by_source: Record<string, number>;
        by_utm_source: Record<string, number>;
        by_day: Record<string, number>;
        by_country: Record<string, number>;
        by_city: Record<string, number>;
      };

      return {
        total: result.total || 0,
        bySource: result.by_source || {},
        byUtmSource: result.by_utm_source || {},
        byDay: result.by_day || {},
        byCountry: result.by_country || {},
        byCity: result.by_city || {},
      } as LeadStatsOptimized;
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
}
