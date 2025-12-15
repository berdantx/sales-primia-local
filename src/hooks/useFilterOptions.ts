import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FilterOptions {
  billingTypes: string[];
  paymentMethods: string[];
  sckCodes: string[];
}

export function useFilterOptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['filter-options', user?.id],
    queryFn: async () => {
      const [billingTypesResult, paymentMethodsResult, sckCodesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('billing_type')
          .not('billing_type', 'is', null)
          .order('billing_type'),
        supabase
          .from('transactions')
          .select('payment_method')
          .not('payment_method', 'is', null)
          .order('payment_method'),
        supabase
          .from('transactions')
          .select('sck_code')
          .not('sck_code', 'is', null)
          .order('sck_code'),
      ]);

      // Extract unique values
      const billingTypes = [...new Set(
        (billingTypesResult.data || []).map(t => t.billing_type).filter(Boolean)
      )] as string[];
      
      const paymentMethods = [...new Set(
        (paymentMethodsResult.data || []).map(t => t.payment_method).filter(Boolean)
      )] as string[];
      
      const sckCodes = [...new Set(
        (sckCodesResult.data || []).map(t => t.sck_code).filter(Boolean)
      )] as string[];

      return {
        billingTypes,
        paymentMethods,
        sckCodes,
      } as FilterOptions;
    },
    enabled: !!user,
  });
}
