import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFilter } from '@/contexts/FilterContext';

export interface EduzzFilterOption {
  value: string;
  count: number;
}

export interface EduzzFilterOptions {
  products: EduzzFilterOption[];
  utm_sources: EduzzFilterOption[];
  utm_mediums: EduzzFilterOption[];
  utm_campaigns: EduzzFilterOption[];
  utm_contents: EduzzFilterOption[];
}

export function useEduzzFilterOptions() {
  const { user } = useAuth();
  const { clientId } = useFilter();

  return useQuery({
    queryKey: ['eduzz-filter-options', user?.id, clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_eduzz_filter_options', {
        p_client_id: clientId || undefined,
      });

      if (error) {
        console.error('Error fetching Eduzz filter options:', error);
        throw error;
      }

      return (data as unknown as EduzzFilterOptions) || {
        products: [],
        utm_sources: [],
        utm_mediums: [],
        utm_campaigns: [],
        utm_contents: [],
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
