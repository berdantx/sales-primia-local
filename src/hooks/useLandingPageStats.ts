import { useMemo } from 'react';
import { Lead } from './useLeads';
import { normalizePageUrl, getPageDisplayName } from '@/lib/urlUtils';
import { format, differenceInDays, parseISO } from 'date-fns';

export interface LandingPageStats {
  normalizedUrl: string;
  displayName: string;
  leadCount: number;
  percentage: number;
  firstLeadDate: Date | null;
  lastLeadDate: Date | null;
  dailyAverage: number;
  activeDays: number;
  isNew: boolean; // Less than 7 days old
  trend: 'up' | 'down' | 'stable' | 'new';
  trendPercentage: number;
  leadsByDay: Record<string, number>;
}

export interface UseLandingPageStatsProps {
  leads: Lead[] | undefined;
  limit?: number;
}

export function useLandingPageStats({ leads, limit = 10 }: UseLandingPageStatsProps) {
  const stats = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    // Group leads by normalized page URL
    const pageMap = new Map<string, {
      leads: Lead[];
      firstLeadDate: Date | null;
      lastLeadDate: Date | null;
      leadsByDay: Record<string, number>;
    }>();

    leads.forEach((lead) => {
      const normalized = normalizePageUrl(lead.page_url);
      if (!normalized) return;

      const existing = pageMap.get(normalized);
      const leadDate = lead.created_at ? new Date(lead.created_at) : null;
      const dayKey = leadDate ? format(leadDate, 'yyyy-MM-dd') : null;

      if (existing) {
        existing.leads.push(lead);
        if (leadDate) {
          if (!existing.firstLeadDate || leadDate < existing.firstLeadDate) {
            existing.firstLeadDate = leadDate;
          }
          if (!existing.lastLeadDate || leadDate > existing.lastLeadDate) {
            existing.lastLeadDate = leadDate;
          }
        }
        if (dayKey) {
          existing.leadsByDay[dayKey] = (existing.leadsByDay[dayKey] || 0) + 1;
        }
      } else {
        pageMap.set(normalized, {
          leads: [lead],
          firstLeadDate: leadDate,
          lastLeadDate: leadDate,
          leadsByDay: dayKey ? { [dayKey]: 1 } : {},
        });
      }
    });

    // Calculate total for percentage
    const totalWithPage = Array.from(pageMap.values()).reduce(
      (sum, data) => sum + data.leads.length,
      0
    );

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Convert to stats array
    const statsArray: LandingPageStats[] = Array.from(pageMap.entries()).map(
      ([normalizedUrl, data]) => {
        const leadCount = data.leads.length;
        const activeDays = data.firstLeadDate && data.lastLeadDate
          ? Math.max(1, differenceInDays(data.lastLeadDate, data.firstLeadDate) + 1)
          : 1;
        const dailyAverage = leadCount / activeDays;
        
        // Check if this is a new page (less than 7 days old)
        const isNew = data.firstLeadDate 
          ? differenceInDays(now, data.firstLeadDate) < 7 
          : false;

        // Calculate trend (last 7 days vs previous 7 days)
        let recentLeads = 0;
        let previousLeads = 0;

        data.leads.forEach((lead) => {
          if (!lead.created_at) return;
          const leadDate = new Date(lead.created_at);
          if (leadDate >= sevenDaysAgo) {
            recentLeads++;
          } else if (leadDate >= fourteenDaysAgo) {
            previousLeads++;
          }
        });

        let trend: 'up' | 'down' | 'stable' | 'new' = 'stable';
        let trendPercentage = 0;

        if (isNew) {
          trend = 'new';
        } else if (previousLeads === 0 && recentLeads > 0) {
          trend = 'up';
          trendPercentage = 100;
        } else if (previousLeads > 0) {
          trendPercentage = ((recentLeads - previousLeads) / previousLeads) * 100;
          if (trendPercentage > 5) {
            trend = 'up';
          } else if (trendPercentage < -5) {
            trend = 'down';
          }
        }

        return {
          normalizedUrl,
          displayName: getPageDisplayName(normalizedUrl),
          leadCount,
          percentage: totalWithPage > 0 ? (leadCount / totalWithPage) * 100 : 0,
          firstLeadDate: data.firstLeadDate,
          lastLeadDate: data.lastLeadDate,
          dailyAverage,
          activeDays,
          isNew,
          trend,
          trendPercentage,
          leadsByDay: data.leadsByDay,
        };
      }
    );

    // Sort by lead count and limit
    return statsArray
      .sort((a, b) => b.leadCount - a.leadCount)
      .slice(0, limit);
  }, [leads, limit]);

  const totalPagesCount = useMemo(() => {
    if (!leads) return 0;
    const uniquePages = new Set(
      leads
        .map((l) => normalizePageUrl(l.page_url))
        .filter(Boolean)
    );
    return uniquePages.size;
  }, [leads]);

  // Get page options for filter dropdown
  const pageOptions = useMemo(() => {
    if (!leads) return [];

    const pageCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const normalized = normalizePageUrl(lead.page_url);
      if (normalized) {
        pageCounts[normalized] = (pageCounts[normalized] || 0) + 1;
      }
    });

    return Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([url, count]) => ({
        value: url,
        label: getPageDisplayName(url),
        count,
      }));
  }, [leads]);

  return { stats, totalPagesCount, pageOptions };
}
