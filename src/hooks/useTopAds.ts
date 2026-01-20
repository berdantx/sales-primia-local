import { useMemo } from 'react';
import { Lead } from './useLeads';
import { normalizePageUrl, getPageDisplayName } from '@/lib/urlUtils';

export type ViewMode = 'ads' | 'campaigns' | 'pages';

export interface TopItem {
  name: string;
  lead_count: number;
  percentage: number;
  related: string[];
  firstLeadDate?: Date | null;
  isNew?: boolean;
}

export interface TopItemsFilters {
  leads: Lead[] | undefined;
  limit?: number;
  mode?: ViewMode;
}

export function useTopItems({ leads, limit = 5, mode = 'ads' }: TopItemsFilters) {
  const topItems = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    // Determine field based on mode
    let getFieldValue: (lead: Lead) => string | null;
    let getRelatedValue: (lead: Lead) => string | null;

    if (mode === 'pages') {
      getFieldValue = (lead) => {
        const normalized = normalizePageUrl(lead.page_url);
        return normalized ? getPageDisplayName(normalized) : null;
      };
      getRelatedValue = (lead) => lead.utm_campaign;
    } else if (mode === 'ads') {
      getFieldValue = (lead) => lead.utm_content;
      getRelatedValue = (lead) => lead.utm_campaign;
    } else {
      getFieldValue = (lead) => lead.utm_campaign;
      getRelatedValue = (lead) => lead.utm_content;
    }

    // Aggregate by selected field
    const itemMap = new Map<string, { 
      count: number; 
      related: Set<string>;
      firstLeadDate: Date | null;
    }>();

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    leads.forEach((lead) => {
      const value = getFieldValue(lead);
      if (!value) return;

      const leadDate = lead.created_at ? new Date(lead.created_at) : null;
      const existing = itemMap.get(value);

      if (existing) {
        existing.count++;
        const relatedValue = getRelatedValue(lead);
        if (relatedValue) {
          existing.related.add(relatedValue);
        }
        if (leadDate && (!existing.firstLeadDate || leadDate < existing.firstLeadDate)) {
          existing.firstLeadDate = leadDate;
        }
      } else {
        itemMap.set(value, {
          count: 1,
          related: new Set(getRelatedValue(lead) ? [getRelatedValue(lead)!] : []),
          firstLeadDate: leadDate,
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
      .map(([name, data]) => {
        const isNew = data.firstLeadDate 
          ? (now.getTime() - data.firstLeadDate.getTime()) / (1000 * 60 * 60 * 24) < 7
          : false;

        return {
          name,
          lead_count: data.count,
          percentage: totalWithField > 0 
            ? (data.count / totalWithField) * 100 
            : 0,
          related: Array.from(data.related).sort(),
          firstLeadDate: data.firstLeadDate,
          isNew,
        };
      })
      .sort((a, b) => b.lead_count - a.lead_count)
      .slice(0, limit);

    return sorted;
  }, [leads, limit, mode]);

  const totalCount = useMemo(() => {
    if (!leads) return 0;
    
    if (mode === 'pages') {
      const uniquePages = new Set(
        leads
          .map(l => normalizePageUrl(l.page_url))
          .filter(Boolean)
      );
      return uniquePages.size;
    }
    
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
