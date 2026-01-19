import { useMemo } from 'react';
import { Lead } from './useLeads';

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
  const topAds = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    // Aggregate by utm_content
    const adMap = new Map<string, { count: number; campaigns: Set<string> }>();

    leads.forEach((lead) => {
      const utmContent = lead.utm_content;
      if (!utmContent) return;

      const existing = adMap.get(utmContent);
      if (existing) {
        existing.count++;
        if (lead.utm_campaign) {
          existing.campaigns.add(lead.utm_campaign);
        }
      } else {
        adMap.set(utmContent, {
          count: 1,
          campaigns: new Set(lead.utm_campaign ? [lead.utm_campaign] : []),
        });
      }
    });

    // Calculate total leads with utm_content
    const totalWithUtmContent = Array.from(adMap.values()).reduce(
      (sum, item) => sum + item.count,
      0
    );

    // Convert to array and sort by count
    const sorted: TopAd[] = Array.from(adMap.entries())
      .map(([utm_content, data]) => ({
        utm_content,
        lead_count: data.count,
        percentage: totalWithUtmContent > 0 
          ? (data.count / totalWithUtmContent) * 100 
          : 0,
        campaigns: Array.from(data.campaigns).sort(),
      }))
      .sort((a, b) => b.lead_count - a.lead_count)
      .slice(0, limit);

    return sorted;
  }, [leads, limit]);

  const totalAdsCount = useMemo(() => {
    if (!leads) return 0;
    return new Set(leads.filter(l => l.utm_content).map(l => l.utm_content)).size;
  }, [leads]);

  return { topAds, totalAdsCount };
}
