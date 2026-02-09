import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ConversionPageStat {
  normalizedUrl: string;
  displayName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  averageTicket: number;
}

export interface ConversionSummary {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  conversionRate: number;
  qualificationRate: number;
  qualifiedConversionRate: number;
  averageTicket: number;
  pageConversions: ConversionPageStat[];
}

interface UseConversionSummaryRpcProps {
  clientId?: string | null;
  startDate?: Date;
  endDate?: Date;
}

const defaultSummary: ConversionSummary = {
  totalLeads: 0,
  qualifiedLeads: 0,
  convertedLeads: 0,
  totalRevenue: 0,
  conversionRate: 0,
  qualificationRate: 0,
  qualifiedConversionRate: 0,
  averageTicket: 0,
  pageConversions: [],
};

export function useConversionSummaryRpc({
  clientId,
  startDate,
  endDate,
}: UseConversionSummaryRpcProps) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversion-summary-rpc', user?.id, clientId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversion_summary', {
        p_client_id: clientId || null,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });

      if (error) throw error;
      const result = data as unknown as ConversionSummary;
      return result || defaultSummary;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
