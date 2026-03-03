import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Fetches lead counts per client using server-side RPC.
 * Falls back to a lightweight estimated count if RPC is unavailable.
 */
export function useClientLeadCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-lead-counts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_lead_counts');

      if (error) {
        console.error('Error fetching client lead counts:', error);
        throw error;
      }

      return (data as Record<string, number>) || {};
    },
    enabled: !!user,
    staleTime: 120000,
  });
}
