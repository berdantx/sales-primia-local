import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DollarRateResponse {
  rate: number;
  source: string;
  timestamp: string;
  warning?: string;
}

export function useDollarRate() {
  return useQuery<DollarRateResponse>({
    queryKey: ['dollar-rate'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-dollar-rate');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data as DollarRateResponse;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes (rate doesn't change that often)
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}
