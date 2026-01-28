import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ClientLeadCount {
  client_id: string;
  count: number;
}

export function useClientLeadCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-lead-counts', user?.id],
    queryFn: async () => {
      // Use a more efficient query that groups by client_id
      // with a limit to prevent timeout on large datasets
      const { data, error } = await supabase
        .from('leads')
        .select('client_id')
        .not('client_id', 'is', null)
        .limit(10000); // Limit to prevent timeout

      if (error) {
        console.error('Error fetching client lead counts:', error);
        throw error;
      }

      // Count leads per client
      const counts: Record<string, number> = {};
      data?.forEach(lead => {
        if (lead.client_id) {
          counts[lead.client_id] = (counts[lead.client_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!user,
    staleTime: 120000, // Cache for 2 minutes to reduce database load
  });
}
