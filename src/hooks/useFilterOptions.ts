import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterOptions {
  billingTypes: FilterOption[];
  paymentMethods: FilterOption[];
  sckCodes: FilterOption[];
  products: FilterOption[];
}

interface RpcResponse {
  billing_types: FilterOption[] | null;
  payment_methods: FilterOption[] | null;
  sck_codes: FilterOption[] | null;
  products: FilterOption[] | null;
}

export function useFilterOptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['filter-options', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_filter_options_with_counts');

      if (error) throw error;

      const response = data as unknown as RpcResponse;

      return {
        billingTypes: response?.billing_types || [],
        paymentMethods: response?.payment_methods || [],
        sckCodes: response?.sck_codes || [],
        products: response?.products || [],
      } as FilterOptions;
    },
    enabled: !!user,
  });
}
