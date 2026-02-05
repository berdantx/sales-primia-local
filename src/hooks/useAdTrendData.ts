import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ViewMode } from './useTopAds';
import { format, parseISO, endOfWeek } from 'date-fns';
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
 * Hook to fetch ad trend data using optimized RPC function
 * This aggregates data directly in the database to avoid timeout issues
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

      // Call the optimized RPC function
      const { data, error } = await supabase.rpc('get_ad_trend_data', {
        p_client_id: clientId || null,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
        p_top_item_names: topItemNames,
        p_mode: mode,
        p_group_by: groupBy
      });

      if (error) {
        console.error('Error fetching ad trend data:', error);
        throw error;
      }

      // Parse JSONB response - cast to array of records
      const rows = data as unknown as Array<Record<string, unknown>>;
      
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return [];
      }

      // Transform RPC response to TrendDataPoint format
      const result: TrendDataPoint[] = rows.map((row) => {
        const dateStr = row.date as string;
        const parsedDate = parseISO(dateStr);
        
        let displayDate: string;
        if (groupBy === 'week') {
          const weekEnd = endOfWeek(parsedDate, { weekStartsOn: 1 });
          displayDate = `${format(parsedDate, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`;
        } else {
          displayDate = format(parsedDate, 'dd/MM', { locale: ptBR });
        }

        const dataPoint: TrendDataPoint = {
          date: dateStr,
          displayDate,
        };

        // Add count for each top item from the row
        topItemNames.forEach((name) => {
          dataPoint[name] = (row[name] as number) || 0;
        });

        return dataPoint;
      });

      // Sort by date
      result.sort((a, b) => a.date.localeCompare(b.date));

      return result;
    },
    enabled: !!user && topItemNames.length > 0,
    staleTime: 30000,
  });
}
