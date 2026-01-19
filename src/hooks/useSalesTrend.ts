import { useMemo } from 'react';
import { format, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SalesViewMode } from './useTopSales';

export type SalesGroupBy = 'day' | 'week';

export interface SalesTrendDataPoint {
  date: string;
  displayDate: string;
  [key: string]: string | number;
}

export interface UseSalesTrendFilters<T> {
  transactions: T[] | undefined;
  topItemNames: string[];
  mode?: SalesViewMode;
  groupBy?: SalesGroupBy;
  // Field mappings
  dateField?: keyof T;
  productField?: keyof T;
  campaignField?: keyof T;
  originField?: keyof T;
  adsField?: keyof T;
  valueField?: keyof T;
  valueMode?: 'count' | 'value';
}

export function useSalesTrend<T>({
  transactions,
  topItemNames,
  mode = 'products',
  groupBy = 'day',
  dateField = 'purchase_date' as keyof T,
  productField = 'product' as keyof T,
  campaignField = 'utm_campaign' as keyof T,
  originField = 'sck_code' as keyof T,
  adsField = 'utm_content' as keyof T,
  valueField = 'computed_value' as keyof T,
  valueMode = 'count',
}: UseSalesTrendFilters<T>) {
  const trendData = useMemo(() => {
    if (!transactions || transactions.length === 0 || topItemNames.length === 0) {
      return [];
    }

    // Determine which field to use based on mode
    const primaryField = mode === 'products' 
      ? productField 
      : mode === 'campaigns' 
        ? campaignField 
        : mode === 'ads'
          ? adsField
          : originField;

    // Group by date (day or week)
    const dateGroups = new Map<string, Map<string, number>>();

    transactions.forEach((transaction) => {
      const dateValue = transaction[dateField];
      if (!dateValue) return;

      let dateStr: string;
      try {
        const parsedDate = typeof dateValue === 'string' 
          ? parseISO(dateValue.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'))
          : new Date(dateValue as number);
        
        if (isNaN(parsedDate.getTime())) return;

        if (groupBy === 'week') {
          const weekStart = startOfWeek(parsedDate, { weekStartsOn: 0 });
          dateStr = format(weekStart, 'yyyy-MM-dd');
        } else {
          dateStr = format(parsedDate, 'yyyy-MM-dd');
        }
      } catch {
        return;
      }

      const itemName = transaction[primaryField];
      if (!itemName || typeof itemName !== 'string') return;

      // Only track items that are in the top list
      if (!topItemNames.includes(itemName)) return;

      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, new Map());
      }

      const itemGroup = dateGroups.get(dateStr)!;
      const increment = valueMode === 'value' 
        ? (Number(transaction[valueField]) || 0) 
        : 1;
      itemGroup.set(itemName, (itemGroup.get(itemName) || 0) + increment);
    });

    // Convert to array format for chart
    const result: SalesTrendDataPoint[] = Array.from(dateGroups.entries())
      .map(([date, items]) => {
        const dataPoint: SalesTrendDataPoint = {
          date,
          displayDate: groupBy === 'week'
            ? `Sem ${format(parseISO(date), 'dd/MM', { locale: ptBR })}`
            : format(parseISO(date), 'dd/MM', { locale: ptBR }),
        };

        // Add counts for each top item
        topItemNames.forEach((name) => {
          dataPoint[name] = items.get(name) || 0;
        });

        return dataPoint;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [transactions, topItemNames, mode, groupBy, dateField, productField, campaignField, originField, adsField, valueField, valueMode]);

  return { trendData };
}
