import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFilter } from '@/contexts/FilterContext';

export interface CispayFilterOption {
  value: string;
  count: number;
}

export interface CispayFilterOptions {
  products: CispayFilterOption[];
  turmas: CispayFilterOption[];
  units: CispayFilterOption[];
}

export function useCispayFilterOptions() {
  const { user } = useAuth();
  const { clientId } = useFilter();

  return useQuery({
    queryKey: ['cispay-filter-options', user?.id, clientId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_cispay_filter_options', {
        p_client_id: clientId || undefined,
      });

      if (error) {
        console.error('Error fetching CIS PAY filter options:', error);
        throw error;
      }

      return (data as unknown as CispayFilterOptions) || {
        products: [],
        turmas: [],
        units: [],
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
