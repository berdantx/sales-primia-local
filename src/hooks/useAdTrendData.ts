import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ViewMode } from './useTopAds';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type GroupBy = 'day' | 'week';

export interface TrendDataPoint {
  date: string;
  displayDate: string;
  [key: string]: number | string;
}

export interface UseAdTrendDataFilters {
  clientId?: string | null;
  startDate?: Date;
  endDate?: Date;
  topItemNames: string[];
  mode: ViewMode;
  groupBy?: GroupBy;
}

/**
 * Hook to fetch ad trend data directly from the database
 * This avoids the pagination issue where only 50 leads are loaded
 */
export function useAdTrendData({
  clientId,
  startDate,
  endDate,
  topItemNames,
  mode,
  groupBy = 'day'
}: UseAdTrendDataFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ad-trend-data', user?.id, clientId, startDate?.toISOString(), endDate?.toISOString(), topItemNames, mode, groupBy],
    queryFn: async () => {
      if (topItemNames.length === 0) return [];

      // Determine which field to use based on mode
      const field = mode === 'ads' ? 'utm_content' 
        : mode === 'campaigns' ? 'utm_campaign' 
        : 'page_url';

      // Build query
      let query = supabase
        .from('leads')
        .select('created_at, utm_content, utm_campaign, page_url')
        .not('created_at', 'is', null);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: leads, error } = await query;

      if (error) throw error;
      if (!leads || leads.length === 0) return [];

      // Helper to normalize page URLs
      const normalizeUrl = (url: string | null): string | null => {
        if (!url) return null;
        return url.replace(/^https?:\/\//, '').replace(/\?.*$/, '');
      };

      // Get field value based on mode
      const getFieldValue = (lead: typeof leads[0]): string | null => {
        if (mode === 'ads') return lead.utm_content;
        if (mode === 'campaigns') return lead.utm_campaign;
        if (mode === 'pages') return normalizeUrl(lead.page_url);
        return lead.utm_content;
      };

      // Group leads by date and item
      const dateMap = new Map<string, Map<string, number>>();

      leads.forEach((lead) => {
        if (!lead.created_at) return;
        
        const itemValue = getFieldValue(lead);
        if (!itemValue || !topItemNames.includes(itemValue)) return;

        let dateKey: string;
        const leadDate = parseISO(lead.created_at);

        if (groupBy === 'week') {
          const weekStart = startOfWeek(leadDate, { weekStartsOn: 1 });
          dateKey = format(weekStart, 'yyyy-MM-dd');
        } else {
          dateKey = format(leadDate, 'yyyy-MM-dd');
        }

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, new Map());
        }

        const itemCounts = dateMap.get(dateKey)!;
        itemCounts.set(itemValue, (itemCounts.get(itemValue) || 0) + 1);
      });

      // Convert to array sorted by date
      const sortedDates = Array.from(dateMap.keys()).sort();

      const result: TrendDataPoint[] = sortedDates.map((date) => {
        const itemCounts = dateMap.get(date)!;
        const parsedDate = parseISO(date);
        
        let displayDate: string;
        if (groupBy === 'week') {
          const weekEnd = endOfWeek(parsedDate, { weekStartsOn: 1 });
          displayDate = `${format(parsedDate, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`;
        } else {
          displayDate = format(parsedDate, 'dd/MM', { locale: ptBR });
        }

        const dataPoint: TrendDataPoint = {
          date,
          displayDate,
        };

        // Add count for each top item
        topItemNames.forEach((name) => {
          dataPoint[name] = itemCounts.get(name) || 0;
        });

        return dataPoint;
      });

      return result;
    },
    enabled: !!user && topItemNames.length > 0,
    staleTime: 30000,
  });
}
