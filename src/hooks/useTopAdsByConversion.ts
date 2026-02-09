import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ConversionAdItem {
  name: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  avgTicket: number;
}

export interface TopAdsByConversionFilters {
  clientId?: string | null;
  startDate?: Date;
  endDate?: Date;
  mode?: 'ads' | 'campaigns';
  limit?: number;
}

export function useTopAdsByConversion(filters?: TopAdsByConversionFilters) {
  const { user } = useAuth();
  const mode = filters?.mode || 'ads';
  const limit = filters?.limit || 10;

  return useQuery({
    queryKey: ['top-ads-by-conversion', user?.id, {
      clientId: filters?.clientId,
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
      mode,
      limit,
    }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_ads_by_conversion', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_mode: mode,
        p_limit: limit,
      });

      if (error) throw error;

      const result = data as unknown as { items: ConversionAdItem[] };
      return result?.items || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
