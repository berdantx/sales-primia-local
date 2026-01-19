import { useMemo } from 'react';
import { Lead } from './useLeads';

export type ViewMode = 'ads' | 'campaigns';

export interface TopItem {
  name: string;
  lead_count: number;
  percentage: number;
  related: string[];
}

export interface TopItemsFilters {
  leads: Lead[] | undefined;
  limit?: number;
  mode?: ViewMode;
}

export function useTopItems({ leads, limit = 5, mode = 'ads' }: TopItemsFilters) {
  const topItems = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const field = mode === 'ads' ? 'utm_content' : 'utm_campaign';
    const relatedField = mode === 'ads' ? 'utm_campaign' : 'utm_content';

    // Aggregate by selected field
    const itemMap = new Map<string, { count: number; related: Set<string> }>();

    leads.forEach((lead) => {
      const value = lead[field];
      if (!value) return;

      const existing = itemMap.get(value);
      if (existing) {
        existing.count++;
        const relatedValue = lead[relatedField];
        if (relatedValue) {
          existing.related.add(relatedValue);
        }
      } else {
        itemMap.set(value, {
          count: 1,
          related: new Set(lead[relatedField] ? [lead[relatedField]] : []),
        });
      }
    });

    // Calculate total leads with the selected field
    const totalWithField = Array.from(itemMap.values()).reduce(
      (sum, item) => sum + item.count,
      0
    );

    // Convert to array and sort by count
    const sorted: TopItem[] = Array.from(itemMap.entries())
      .map(([name, data]) => ({
        name,
        lead_count: data.count,
        percentage: totalWithField > 0 
          ? (data.count / totalWithField) * 100 
          : 0,
        related: Array.from(data.related).sort(),
      }))
      .sort((a, b) => b.lead_count - a.lead_count)
      .slice(0, limit);

    return sorted;
  }, [leads, limit, mode]);

  const totalCount = useMemo(() => {
    if (!leads) return 0;
    const field = mode === 'ads' ? 'utm_content' : 'utm_campaign';
    return new Set(leads.filter(l => l[field]).map(l => l[field])).size;
  }, [leads, mode]);

  return { topItems, totalCount };
}

// Keep backward compatibility
export interface TopAd {
  utm_content: string;
  lead_count: number;
  percentage: number;
  campaigns: string[];
}

export interface TopAdsFilters {
  leads: Lead[] | undefined;
  limit?: number;
}

export function useTopAds({ leads, limit = 5 }: TopAdsFilters) {
  const { topItems, totalCount } = useTopItems({ leads, limit, mode: 'ads' });
  
  const topAds: TopAd[] = topItems.map(item => ({
    utm_content: item.name,
    lead_count: item.lead_count,
    percentage: item.percentage,
    campaigns: item.related,
  }));

  return { topAds, totalAdsCount: totalCount };
}
