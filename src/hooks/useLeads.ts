import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Lead type definition - used across the app for type safety.
 * Data fetching should use useLeadsPaginated or useLeadStatsOptimized instead.
 */
export interface Lead {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  client_id: string | null;
  external_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  ip_address: string | null;
  organization: string | null;
  customer_account: string | null;
  tags: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_id: string | null;
  utm_term: string | null;
  utm_content: string | null;
  source: string | null;
  page_url: string | null;
  series_id: string | null;
  raw_payload: unknown;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  traffic_type?: string | null;
}

export interface LeadFilters {
  startDate?: Date;
  endDate?: Date;
  source?: string;
  utmSource?: string;
  search?: string;
  clientId?: string | null;
}

export interface LeadStats {
  total: number;
  bySource: Record<string, number>;
  byUtmSource: Record<string, number>;
  byDay: Record<string, number>;
  byCountry: Record<string, number>;
  byCity: Record<string, number>;
}

/**
 * Lightweight hook just for lead count (for Dashboard KPI).
 * Uses RPC function for better performance on large datasets.
 */
export function useLeadCount(filters?: { startDate?: Date; endDate?: Date; clientId?: string | null }) {
  const { user } = useAuth();

  const filterKey = filters ? {
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    clientId: filters.clientId,
  } : null;

  return useQuery({
    queryKey: ['leads-count', user?.id, filterKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lead_stats', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching lead count:', error);
        // Fallback to simple count if RPC fails
        let query = supabase
          .from('leads')
          .select('id', { count: 'estimated', head: true });

        if (filters?.clientId) {
          query = query.eq('client_id', filters.clientId);
        }
        if (filters?.startDate) {
          query = query.gte('created_at', filters.startDate.toISOString());
        }
        if (filters?.endDate) {
          query = query.lte('created_at', filters.endDate.toISOString());
        }

        const { count, error: countError } = await query;
        if (countError) throw countError;
        return count || 0;
      }

      const result = data as { total?: number } | null;
      return result?.total || 0;
    },
    enabled: !!user,
    staleTime: 60000,
  });
}
