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
      // Lightweight: fetch only client_id column with limit
      const { data, error } = await supabase
        .from('leads')
        .select('client_id')
        .not('client_id', 'is', null)
        .limit(5000);

      if (error) {
        console.error('Error fetching client lead counts:', error);
        throw error;
      }

      const counts: Record<string, number> = {};
      data?.forEach(lead => {
        if (lead.client_id) {
          counts[lead.client_id] = (counts[lead.client_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!user,
    staleTime: 120000,
  });
}
