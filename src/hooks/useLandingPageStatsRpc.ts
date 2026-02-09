import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LandingPageStatRpc {
  normalizedUrl: string;
  displayName: string;
  leadCount: number;
  firstLeadDate: string | null;
  lastLeadDate: string | null;
}

interface UseLandingPageStatsRpcProps {
  clientId?: string | null;
  startDate?: Date;
  endDate?: Date;
  minLeads?: number;
  limit?: number;
}

export function useLandingPageStatsRpc({
  clientId,
  startDate,
  endDate,
  minLeads = 5,
  limit = 20,
}: UseLandingPageStatsRpcProps) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['landing-page-stats-rpc', user?.id, clientId, startDate?.toISOString(), endDate?.toISOString(), minLeads, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_landing_page_stats', {
        p_client_id: clientId || null,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
        p_min_leads: minLeads,
        p_limit: limit,
      });

      if (error) throw error;
      
      const result = data as unknown as {
        stats: LandingPageStatRpc[];
        totalPages: number;
        hiddenPages: number;
      };

      return {
        stats: result?.stats || [],
        totalPages: result?.totalPages || 0,
        hiddenPages: result?.hiddenPages || 0,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
