import { useMemo } from 'react';

interface Lead {
  id: string;
  email: string;
  created_at: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

interface FunnelDataPoint {
  date: string;
  totalLeads: number;
  qualifiedLeads: number;
  qualificationRate: number;
  convertedLeads: number;
  conversionRate: number;
  qualifiedConversionRate: number;
}

interface UseFunnelEvolutionProps {
  leads: Lead[];
  convertedEmails: Set<string>;
  groupBy?: 'day' | 'week';
}

export function useFunnelEvolution({
  leads,
  convertedEmails,
  groupBy = 'day',
}: UseFunnelEvolutionProps): FunnelDataPoint[] {
  return useMemo(() => {
    if (!leads.length) return [];

    // Group leads by date
    const groupedData = new Map<string, {
      total: number;
      qualified: number;
      converted: number;
      emails: Set<string>;
    }>();

    for (const lead of leads) {
      if (!lead.created_at) continue;
      
      const date = new Date(lead.created_at);
      let key: string;
      
      if (groupBy === 'week') {
        // Get week start (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = date.toISOString().split('T')[0];
      }
      
      const existing = groupedData.get(key) || { 
        total: 0, 
        qualified: 0, 
        converted: 0,
        emails: new Set<string>(),
      };
      
      existing.total++;
      
      // Check if qualified (complete UTMs)
      if (lead.utm_source && lead.utm_medium && lead.utm_campaign) {
        existing.qualified++;
      }
      
      // Check if converted
      const email = lead.email?.toLowerCase().trim();
      if (email && convertedEmails.has(email) && !existing.emails.has(email)) {
        existing.converted++;
        existing.emails.add(email);
      }
      
      groupedData.set(key, existing);
    }

    // Convert to array and calculate rates
    const dataPoints: FunnelDataPoint[] = [];
    
    for (const [date, data] of groupedData) {
      dataPoints.push({
        date,
        totalLeads: data.total,
        qualifiedLeads: data.qualified,
        qualificationRate: data.total > 0 ? (data.qualified / data.total) * 100 : 0,
        convertedLeads: data.converted,
        conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
        qualifiedConversionRate: data.qualified > 0 ? (data.converted / data.qualified) * 100 : 0,
      });
    }

    // Sort by date
    return dataPoints.sort((a, b) => a.date.localeCompare(b.date));
  }, [leads, convertedEmails, groupBy]);
}
