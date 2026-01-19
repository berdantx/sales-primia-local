import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
}

export interface LeadFilters {
  startDate?: Date;
  endDate?: Date;
  source?: string;
  utmSource?: string;
  search?: string;
  clientId?: string | null;
}

export function useLeads(filters?: LeadFilters) {
  const { user } = useAuth();

  const filterKey = filters ? {
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    source: filters.source,
    utmSource: filters.utmSource,
    search: filters.search,
    clientId: filters.clientId,
  } : null;

  return useQuery({
    queryKey: ['leads', user?.id, filterKey],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: Lead[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('leads')
          .select('*')
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
        if (filters?.source) {
          query = query.eq('source', filters.source);
        }
        if (filters?.utmSource) {
          query = query.eq('utm_source', filters.utmSource);
        }
        if (filters?.search) {
          query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...(data as Lead[])];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
    enabled: !!user,
  });
}

export interface LeadStats {
  total: number;
  bySource: Record<string, number>;
  byUtmSource: Record<string, number>;
  byDay: Record<string, number>;
}

export function useLeadStats(filters?: LeadFilters) {
  const { data: leads, isLoading } = useLeads(filters);

  const stats: LeadStats | null = leads ? {
    total: leads.length,
    
    bySource: leads.reduce((acc, lead) => {
      const source = lead.source || 'desconhecido';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    
    byUtmSource: leads.reduce((acc, lead) => {
      const utmSource = lead.utm_source || 'direto';
      acc[utmSource] = (acc[utmSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    
    byDay: leads.reduce((acc, lead) => {
      // Supabase pode retornar "2026-01-19 02:28:53" (com espaço) ou "2026-01-19T02:28:53"
      const date = lead.created_at ? lead.created_at.split(/[T ]/)[0] : 'unknown';
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  } : null;

  return { stats, isLoading };
}

// Lightweight hook just for lead count (for Dashboard KPI)
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
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true });

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { count, error } = await query;
      if (error) throw error;

      return count || 0;
    },
    enabled: !!user,
  });
}
