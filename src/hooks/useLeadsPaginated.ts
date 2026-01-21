import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Lead } from './useLeads';

export interface LeadsPaginatedFilters {
  startDate?: Date;
  endDate?: Date;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  country?: string;
  pageUrl?: string;
  search?: string;
  clientId?: string | null;
  showTestLeads?: boolean;
  showQualified?: string; // 'all' | 'qualified' | 'unqualified'
  trafficType?: string; // 'paid' | 'organic' | 'direct'
}

export interface UseLeadsPaginatedOptions {
  filters?: LeadsPaginatedFilters;
  page?: number;
  pageSize?: number;
}

export function useLeadsPaginated({ 
  filters, 
  page = 0, 
  pageSize = 50 
}: UseLeadsPaginatedOptions) {
  const { user } = useAuth();

  const filterKey = {
    ...filters,
    startDate: filters?.startDate?.toISOString(),
    endDate: filters?.endDate?.toISOString(),
    page,
    pageSize,
  };

  return useQuery({
    queryKey: ['leads-paginated', user?.id, filterKey],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters?.source && filters.source !== 'all') {
        query = query.eq('source', filters.source);
      }
      if (filters?.utmSource && filters.utmSource !== 'all') {
        query = query.eq('utm_source', filters.utmSource);
      }
      if (filters?.utmMedium && filters.utmMedium !== 'all') {
        query = query.eq('utm_medium', filters.utmMedium);
      }
      if (filters?.utmCampaign && filters.utmCampaign !== 'all') {
        query = query.eq('utm_campaign', filters.utmCampaign);
      }
      if (filters?.utmContent && filters.utmContent !== 'all') {
        query = query.eq('utm_content', filters.utmContent);
      }
      if (filters?.utmTerm && filters.utmTerm !== 'all') {
        query = query.eq('utm_term', filters.utmTerm);
      }
      if (filters?.country && filters.country !== 'all') {
        query = query.eq('country', filters.country);
      }
      if (filters?.pageUrl && filters.pageUrl !== 'all') {
        query = query.ilike('page_url', `%${filters.pageUrl}%`);
      }
      if (filters?.search) {
        query = query.or(
          `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      // Filter test leads (containing 'teste' or 'test' in tags)
      if (filters?.showTestLeads === false) {
        query = query.or('tags.is.null,tags.not.ilike.%test%');
      }

      // Filter by traffic type (using filter since column is generated and may not be in types)
      if (filters?.trafficType) {
        query = query.filter('traffic_type', 'eq', filters.trafficType);
      }

      // Apply pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      // Post-filter for qualified leads (needs to be done client-side)
      let filteredData = data as Lead[];
      
      if (filters?.showQualified === 'qualified') {
        filteredData = filteredData.filter(lead => 
          lead.utm_source && lead.utm_medium && lead.utm_campaign
        );
      } else if (filters?.showQualified === 'unqualified') {
        filteredData = filteredData.filter(lead => 
          !lead.utm_source || !lead.utm_medium || !lead.utm_campaign
        );
      }

      return {
        leads: filteredData,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!user,
    staleTime: 10000,
  });
}
