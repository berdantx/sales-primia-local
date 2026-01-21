import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TopAdItem {
  name: string;
  count: number;
  percentage: number;
  firstLeadDate: string | null;
  isNew: boolean;
}

export interface TopAdsResult {
  items: TopAdItem[];
  totalCount: number;
}

export interface TopAdsFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
  mode?: 'ads' | 'campaigns' | 'pages';
  limit?: number;
}

export function useTopAdsOptimized(filters?: TopAdsFilters) {
  const { user } = useAuth();
  const mode = filters?.mode || 'ads';
  const limit = filters?.limit || 10;

  const filterKey = filters ? {
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    clientId: filters.clientId,
    mode,
    limit,
  } : null;

  return useQuery({
    queryKey: ['top-ads-optimized', user?.id, filterKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_ads', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_mode: mode,
        p_limit: limit,
      });

      if (error) throw error;

      const result = data as {
        items: Array<{
          name: string;
          count: number;
          percentage: number;
          firstLeadDate: string | null;
          isNew: boolean;
        }>;
        totalCount: number;
      };

      return {
        items: result.items || [],
        totalCount: result.totalCount || 0,
      } as TopAdsResult;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
