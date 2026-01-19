import { useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead } from './useLeads';
import { ViewMode } from './useTopAds';

export type GroupBy = 'day' | 'week';

export interface TrendDataPoint {
  date: string;
  displayDate: string;
  [key: string]: number | string;
}

export interface UseAdTrendFilters {
  leads: Lead[] | undefined;
  topItemNames: string[];
  mode: ViewMode;
  groupBy?: GroupBy;
}

export function useAdTrend({ 
  leads, 
  topItemNames, 
  mode, 
  groupBy = 'day' 
}: UseAdTrendFilters) {
  const trendData = useMemo(() => {
    if (!leads || leads.length === 0 || topItemNames.length === 0) return [];

    const field = mode === 'ads' ? 'utm_content' : 'utm_campaign';

    // Group leads by date and item
    const dateMap = new Map<string, Map<string, number>>();

    leads.forEach((lead) => {
      if (!lead.created_at) return;
      
      const itemValue = lead[field];
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
  }, [leads, topItemNames, mode, groupBy]);

  return { trendData };
}
