import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TmbFilterOption {
  value: string;
  count: number;
}

export interface TmbFilterOptions {
  products: TmbFilterOption[];
  utm_sources: TmbFilterOption[];
  utm_mediums: TmbFilterOption[];
  utm_campaigns: TmbFilterOption[];
}

export function useTmbFilterOptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tmb-filter-options', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tmb_filter_options');

      if (error) {
        console.error('Error fetching TMB filter options:', error);
        throw error;
      }

      return (data as unknown as TmbFilterOptions) || {
        products: [],
        utm_sources: [],
        utm_mediums: [],
        utm_campaigns: [],
      };
    },
    enabled: !!user,
  });
}
