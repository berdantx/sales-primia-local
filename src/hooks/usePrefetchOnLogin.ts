import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

/**
 * Returns a function that prefetches key data in background after login.
 * This warms the React Query cache so pages like Leads load instantly.
 */
export function usePrefetchOnLogin() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(async (userId: string) => {
    // 1. Prefetch clients list
    queryClient.prefetchQuery({
      queryKey: ['clients', userId],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_user_clients');
        if (error) throw error;
        return data || [];
      },
      staleTime: 60000,
    });

    // 2. Prefetch client lead counts (lightweight RPC)
    queryClient.prefetchQuery({
      queryKey: ['client-lead-counts', userId],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_client_lead_counts');
        if (error) throw error;
        return data || {};
      },
      staleTime: 120000,
    });

    // 3. Prefetch lead stats for all clients — uses get_lead_stats RPC
    queryClient.prefetchQuery({
      queryKey: ['lead-stats-optimized', userId, null],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_lead_stats', {
          p_client_id: null,
          p_start_date: null,
          p_end_date: null,
        });
        if (error) {
          console.warn('Prefetch lead stats failed:', error.message);
          throw error;
        }
        const result = data as Record<string, unknown>;
        return {
          total: (result.total as number) || 0,
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
        };
      },
      staleTime: 30000,
    });
  }, [queryClient]);

  return prefetch;
}
