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
      // Get all leads grouped by client_id
      const { data, error } = await supabase
        .from('leads')
        .select('client_id');

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
    staleTime: 60000, // Cache for 1 minute
  });
}
