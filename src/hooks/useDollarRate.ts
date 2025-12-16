import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DollarRateResponse {
  rate: number;
  ask: number;
  high: number;
  low: number;
  source: string;
  timestamp: string;
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
