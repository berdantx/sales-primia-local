import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LeadStatsOptimized {
  total: number;
  bySource: Record<string, number>;
  byUtmSource: Record<string, number>;
  byUtmMedium: Record<string, number>;
  byUtmCampaign: Record<string, number>;
  byUtmContent: Record<string, number>;
  byUtmTerm: Record<string, number>;
  byDay: Record<string, number>;
  byCountry: Record<string, number>;
  byCity: Record<string, number>;
  byPage: Record<string, number>;
  byTrafficType: Record<string, number>;
}

export interface LeadStatsFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
  trafficType?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export function useLeadStatsOptimized(filters?: LeadStatsFilters) {
  const { user } = useAuth();

  const filterKey = filters ? {
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    clientId: filters.clientId,
    trafficType: filters.trafficType,
    source: filters.source,
    utmSource: filters.utmSource,
    utmMedium: filters.utmMedium,
    utmCampaign: filters.utmCampaign,
  } : null;

  return useQuery({
    queryKey: ['lead-stats-optimized', user?.id, filterKey],
    queryFn: async () => {
      const hasDateFilter = !!filters?.startDate || !!filters?.endDate;
      const hasAdvancedFilter = !!filters?.trafficType || !!filters?.source || !!filters?.utmSource || !!filters?.utmMedium || !!filters?.utmCampaign;
      const rpcName = (hasDateFilter || hasAdvancedFilter) ? 'get_lead_stats' : 'get_lead_stats_cached';
      const { data, error } = await supabase.rpc(rpcName as 'get_lead_stats', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_traffic_type: filters?.trafficType || null,
        p_source: filters?.source || null,
        p_utm_source: filters?.utmSource || null,
        p_utm_medium: filters?.utmMedium || null,
        p_utm_campaign: filters?.utmCampaign || null,
      });

      if (error) throw error;

      // Transform the response to match our interface
      const result = data as {
        total: number;
        by_source: Record<string, number>;
        by_traffic_type: Record<string, number>;
        by_utm_source: Record<string, number>;
        by_utm_medium: Record<string, number>;
        by_utm_campaign: Record<string, number>;
        by_utm_content: Record<string, number>;
        by_utm_term: Record<string, number>;
        by_day: Record<string, number>;
        by_country: Record<string, number>;
        by_city: Record<string, number>;
        by_page: Record<string, number>;
      };

      return {
        total: result.total || 0,
        bySource: result.by_source || {},
        byTrafficType: result.by_traffic_type || {},
        byUtmSource: result.by_utm_source || {},
        byUtmMedium: result.by_utm_medium || {},
        byUtmCampaign: result.by_utm_campaign || {},
        byUtmContent: result.by_utm_content || {},
        byUtmTerm: result.by_utm_term || {},
        byDay: result.by_day || {},
        byCountry: result.by_country || {},
        byCity: result.by_city || {},
        byPage: result.by_page || {},
      } as LeadStatsOptimized;
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
}
