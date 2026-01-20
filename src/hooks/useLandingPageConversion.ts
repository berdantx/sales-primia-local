import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { normalizePageUrl } from '@/lib/urlUtils';

interface Lead {
  id: string;
  email: string;
  page_url: string | null;
  created_at: string | null;
}

interface Transaction {
  buyer_email: string | null;
  computed_value?: number;
  sale_value?: number;
  ticket_value?: number;
  currency?: string | null;
}

export interface LandingPageConversion {
  normalizedUrl: string;
  displayName: string;
  totalLeads: number;
  uniqueEmails: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  averageTicket: number;
  currency: string;
}

interface UseLandingPageConversionProps {
  clientId?: string | null;
  leads: Lead[];
  startDate?: Date;
  endDate?: Date;
}

export function useLandingPageConversion({
  clientId,
  leads,
  startDate,
  endDate,
}: UseLandingPageConversionProps) {
  // Fetch all transactions for conversion matching
  const { data: allTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['conversion-transactions', clientId],
    queryFn: async () => {
      const transactions: Transaction[] = [];
      
      // Fetch Hotmart transactions
      const { data: hotmartData } = await supabase
        .from('transactions')
        .select('buyer_email, computed_value, currency')
        .eq('client_id', clientId || '');
      
      if (hotmartData) {
        transactions.push(...hotmartData.map(t => ({
          buyer_email: t.buyer_email,
          computed_value: t.computed_value,
          currency: t.currency,
        })));
      }
      
      // Fetch Eduzz transactions
      const { data: eduzzData } = await supabase
        .from('eduzz_transactions')
        .select('buyer_email, sale_value, currency')
        .eq('client_id', clientId || '');
      
      if (eduzzData) {
        transactions.push(...eduzzData.map(t => ({
          buyer_email: t.buyer_email,
          sale_value: t.sale_value,
          currency: t.currency,
        })));
      }
      
      // Fetch TMB transactions
      const { data: tmbData } = await supabase
        .from('tmb_transactions')
        .select('buyer_email, ticket_value, currency')
        .eq('client_id', clientId || '');
      
      if (tmbData) {
        transactions.push(...tmbData.map(t => ({
          buyer_email: t.buyer_email,
          ticket_value: t.ticket_value,
          currency: t.currency,
        })));
      }
      
      return transactions;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build a map of emails to transaction values
  const transactionsByEmail = useMemo(() => {
    const map = new Map<string, { totalValue: number; count: number; currency: string }>();
    
    if (!allTransactions) return map;
    
    for (const t of allTransactions) {
      if (!t.buyer_email) continue;
      
      const email = t.buyer_email.toLowerCase().trim();
      const value = t.computed_value || t.sale_value || t.ticket_value || 0;
      const currency = t.currency || 'BRL';
      
      const existing = map.get(email) || { totalValue: 0, count: 0, currency };
      map.set(email, {
        totalValue: existing.totalValue + value,
        count: existing.count + 1,
        currency,
      });
    }
    
    return map;
  }, [allTransactions]);

  // Calculate conversion stats per landing page
  const conversionStats = useMemo<LandingPageConversion[]>(() => {
    if (!leads.length) return [];
    
    // Group leads by normalized URL
    const pageGroups = new Map<string, {
      leads: Lead[];
      uniqueEmails: Set<string>;
    }>();
    
    for (const lead of leads) {
      const normalizedUrl = normalizePageUrl(lead.page_url);
      if (!normalizedUrl || normalizedUrl === '/') continue;
      
      const existing = pageGroups.get(normalizedUrl) || {
        leads: [],
        uniqueEmails: new Set<string>(),
      };
      
      existing.leads.push(lead);
      existing.uniqueEmails.add(lead.email.toLowerCase().trim());
      pageGroups.set(normalizedUrl, existing);
    }
    
    // Calculate conversions for each page
    const stats: LandingPageConversion[] = [];
    
    for (const [normalizedUrl, group] of pageGroups) {
      let convertedLeads = 0;
      let totalRevenue = 0;
      let currency = 'BRL';
      
      for (const email of group.uniqueEmails) {
        const transaction = transactionsByEmail.get(email);
        if (transaction) {
          convertedLeads++;
          totalRevenue += transaction.totalValue;
          currency = transaction.currency;
        }
      }
      
      const uniqueEmails = group.uniqueEmails.size;
      const conversionRate = uniqueEmails > 0 ? (convertedLeads / uniqueEmails) * 100 : 0;
      const averageTicket = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;
      
      stats.push({
        normalizedUrl,
        displayName: normalizedUrl,
        totalLeads: group.leads.length,
        uniqueEmails,
        convertedLeads,
        conversionRate,
        totalRevenue,
        averageTicket,
        currency,
      });
    }
    
    // Sort by conversion rate descending
    return stats.sort((a, b) => b.conversionRate - a.conversionRate);
  }, [leads, transactionsByEmail]);

  // Total conversion summary
  const totalConversion = useMemo(() => {
    const totalLeads = conversionStats.reduce((sum, s) => sum + s.uniqueEmails, 0);
    const totalConverted = conversionStats.reduce((sum, s) => sum + s.convertedLeads, 0);
    const totalRevenue = conversionStats.reduce((sum, s) => sum + s.totalRevenue, 0);
    
    return {
      totalLeads,
      totalConverted,
      conversionRate: totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0,
      totalRevenue,
    };
  }, [conversionStats]);

  return {
    conversionStats,
    totalConversion,
    isLoading: isLoadingTransactions,
    transactionCount: allTransactions?.length || 0,
  };
}
