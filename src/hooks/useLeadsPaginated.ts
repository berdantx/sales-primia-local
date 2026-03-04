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
      // Use optimized RPC that handles permissions efficiently
      const { data, error } = await supabase.rpc('get_leads_paginated', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_source: filters?.source || null,
        p_utm_source: filters?.utmSource || null,
        p_utm_medium: filters?.utmMedium || null,
        p_utm_campaign: filters?.utmCampaign || null,
        p_utm_content: filters?.utmContent || null,
        p_utm_term: filters?.utmTerm || null,
        p_country: filters?.country || null,
        p_page_url: filters?.pageUrl || null,
        p_search: filters?.search || null,
        p_show_test_leads: filters?.showTestLeads !== false,
        p_traffic_type: filters?.trafficType || null,
        p_offset: page * pageSize,
        p_limit: pageSize,
      });

      if (error) {
        console.error('[useLeadsPaginated] RPC error:', error.message, error.details, error.hint);
        throw error;
      }

      console.log('[useLeadsPaginated] RPC response type:', typeof data, 'keys:', data ? Object.keys(data as object) : 'null');
      const result = data as unknown as { leads: Lead[]; totalCount: number };
      let filteredData = result.leads || [];
      const totalCount = result.totalCount || 0;
      
      // Post-filter for qualified leads (needs to be done client-side)
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
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    },
    enabled: !!user,
    staleTime: 10000,
  });
}
