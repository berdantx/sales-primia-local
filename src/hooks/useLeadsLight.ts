import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/** Lightweight lead data for conversion matching - no raw_payload */
export interface LightLead {
  id: string;
  email: string | null;
  phone: string | null;
  page_url: string | null;
  created_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

interface UseLeadsLightFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
}

/**
 * Fetches only the fields needed for conversion matching.
 * Much lighter than useLeads which downloads everything including raw_payload.
 */
export function useLeadsLight(filters?: UseLeadsLightFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leads-light', user?.id, filters?.clientId, filters?.startDate?.toISOString(), filters?.endDate?.toISOString()],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: LightLead[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('leads')
          .select('id, email, phone, page_url, created_at, utm_source, utm_medium, utm_campaign')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (filters?.clientId) {
          query = query.eq('client_id', filters.clientId);
        }
        if (filters?.startDate) {
          query = query.gte('created_at', filters.startDate.toISOString());
        }
        if (filters?.endDate) {
          query = query.lte('created_at', filters.endDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...(data as LightLead[])];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
    enabled: !!user && !!filters,
    staleTime: 60000,
  });
}
