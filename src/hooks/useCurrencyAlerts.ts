import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CurrencyAlert {
  id: string;
  transaction_id: string;
  platform: string;
  sale_id: string | null;
  original_currency: string;
  original_value: number;
  converted_value: number;
  conversion_rate: number;
  conversion_source: string;
  alert_type: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  client_id: string | null;
  created_at: string;
}

export function useCurrencyAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['currency-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_conversion_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as CurrencyAlert[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('currency_conversion_alerts')
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-alerts'] });
    },
  });

  const alertsByType = {
    failed_conversion: alertsQuery.data?.filter(a => a.alert_type === 'failed_conversion') || [],
    fallback_used: alertsQuery.data?.filter(a => a.alert_type === 'fallback_used') || [],
    unknown_currency: alertsQuery.data?.filter(a => a.alert_type === 'unknown_currency') || [],
  };

  return {
    alerts: alertsQuery.data || [],
    alertsByType,
    isLoading: alertsQuery.isLoading,
    resolveAlert,
    totalPending: alertsQuery.data?.length || 0,
  };
}
