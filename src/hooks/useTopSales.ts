import { useMemo } from 'react';

export type SalesViewMode = 'products' | 'campaigns' | 'origins' | 'ads';

export interface TopSalesItem {
  name: string;
  count: number;
  totalValue: number;
  percentage: number;
  related: string[];
}

export interface TopSalesFilters<T> {
  transactions: T[] | undefined;
  limit?: number;
  mode?: SalesViewMode;
  productField?: keyof T;
  campaignField?: keyof T;
  originField?: keyof T;
  adsField?: keyof T;
  valueField?: keyof T;
}

export function useTopSales<T>({
  transactions,
  limit = 5,
  mode = 'products',
  productField = 'product' as keyof T,
  campaignField = 'utm_campaign' as keyof T,
  originField = 'sck_code' as keyof T,
  adsField = 'utm_content' as keyof T,
  valueField = 'computed_value' as keyof T,
}: TopSalesFilters<T>) {
  const topItems = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // Determine which field to use based on mode
    const primaryField = mode === 'products' 
      ? productField 
      : mode === 'campaigns' 
        ? campaignField 
        : mode === 'ads'
          ? adsField
          : originField;
    
    // Determine related field (secondary grouping)
    const relatedField = mode === 'products' 
      ? campaignField 
      : productField;

    // Aggregate by selected field
    const itemMap = new Map<string, { count: number; totalValue: number; related: Set<string> }>();

    transactions.forEach((transaction) => {
      const value = transaction[primaryField];
      if (!value || typeof value !== 'string') return;

      const transactionValue = Number(transaction[valueField]) || 0;
      
      const existing = itemMap.get(value);
      if (existing) {
        existing.count++;
        existing.totalValue += transactionValue;
        const relatedValue = transaction[relatedField];
        if (relatedValue && typeof relatedValue === 'string') {
          existing.related.add(relatedValue);
        }
      } else {
        const relatedValue = transaction[relatedField];
        itemMap.set(value, {
          count: 1,
          totalValue: transactionValue,
          related: new Set(relatedValue && typeof relatedValue === 'string' ? [relatedValue] : []),
        });
      }
    });

    // Calculate total transactions with the selected field
    const totalWithField = Array.from(itemMap.values()).reduce(
      (sum, item) => sum + item.count,
      0
    );

    // Convert to array and sort by count (or value)
    const sorted: TopSalesItem[] = Array.from(itemMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalValue: data.totalValue,
        percentage: totalWithField > 0 
          ? (data.count / totalWithField) * 100 
          : 0,
        related: Array.from(data.related).sort(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sorted;
  }, [transactions, limit, mode, productField, campaignField, originField, valueField]);

  const totalCount = useMemo(() => {
    if (!transactions) return 0;
    const primaryField = mode === 'products' 
      ? productField 
      : mode === 'campaigns' 
        ? campaignField 
        : mode === 'ads'
          ? adsField
          : originField;
    return new Set(
      transactions
        .filter(t => t[primaryField])
        .map(t => t[primaryField] as string)
    ).size;
  }, [transactions, mode, productField, campaignField, originField, adsField]);

  return { topItems, totalCount };
}
