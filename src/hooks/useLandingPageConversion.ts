import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { normalizePageUrl } from '@/lib/urlUtils';

interface Lead {
  id: string;
  email: string;
  phone: string | null;
  page_url: string | null;
  created_at: string | null;
}

interface Transaction {
  buyer_email: string | null;
  buyer_phone: string | null;
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

// Normalize phone: remove non-digits, keep last 11 digits (Brazil DDD + phone)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null; // Too short to be valid
  return digits.slice(-11); // Last 11 digits (DDD + phone)
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
        .select('buyer_email, buyer_phone, computed_value, currency')
        .eq('client_id', clientId || '');
      
      if (hotmartData) {
        transactions.push(...hotmartData.map(t => ({
          buyer_email: t.buyer_email,
          buyer_phone: t.buyer_phone,
          computed_value: t.computed_value,
          currency: t.currency,
        })));
      }
      
      // Fetch Eduzz transactions
      const { data: eduzzData } = await supabase
        .from('eduzz_transactions')
        .select('buyer_email, buyer_phone, sale_value, currency')
        .eq('client_id', clientId || '');
      
      if (eduzzData) {
        transactions.push(...eduzzData.map(t => ({
          buyer_email: t.buyer_email,
          buyer_phone: t.buyer_phone,
          sale_value: t.sale_value,
          currency: t.currency,
        })));
      }
      
      // Fetch TMB transactions
      const { data: tmbData } = await supabase
        .from('tmb_transactions')
        .select('buyer_email, buyer_phone, ticket_value, currency')
        .eq('client_id', clientId || '');
      
      if (tmbData) {
        transactions.push(...tmbData.map(t => ({
          buyer_email: t.buyer_email,
          buyer_phone: t.buyer_phone,
          ticket_value: t.ticket_value,
          currency: t.currency,
        })));
      }
      
      return transactions;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build maps of emails/phones to transaction values
  const { transactionsByEmail, transactionsByPhone } = useMemo(() => {
    const emailMap = new Map<string, { totalValue: number; count: number; currency: string }>();
    const phoneMap = new Map<string, { totalValue: number; count: number; currency: string }>();
    
    if (!allTransactions) return { transactionsByEmail: emailMap, transactionsByPhone: phoneMap };
    
    for (const t of allTransactions) {
      const value = t.computed_value || t.sale_value || t.ticket_value || 0;
      const currency = t.currency || 'BRL';
      
      // Index by email
      if (t.buyer_email) {
        const email = t.buyer_email.toLowerCase().trim();
        const existing = emailMap.get(email) || { totalValue: 0, count: 0, currency };
        emailMap.set(email, {
          totalValue: existing.totalValue + value,
          count: existing.count + 1,
          currency,
        });
      }
      
      // Index by phone
      const normalizedPhone = normalizePhone(t.buyer_phone);
      if (normalizedPhone) {
        const existing = phoneMap.get(normalizedPhone) || { totalValue: 0, count: 0, currency };
        phoneMap.set(normalizedPhone, {
          totalValue: existing.totalValue + value,
          count: existing.count + 1,
          currency,
        });
      }
    }
    
    return { transactionsByEmail: emailMap, transactionsByPhone: phoneMap };
  }, [allTransactions]);

  // Calculate conversion stats per landing page
  const conversionStats = useMemo<LandingPageConversion[]>(() => {
    if (!leads.length) return [];
    
    // Group leads by normalized URL
    const pageGroups = new Map<string, {
      leads: Lead[];
      uniqueContacts: Set<string>; // email or phone as unique identifier
      emailToPhone: Map<string, string | null>; // Map email to phone for lookup
    }>();
    
    for (const lead of leads) {
      const normalizedUrl = normalizePageUrl(lead.page_url);
      if (!normalizedUrl || normalizedUrl === '/') continue;
      
      const existing = pageGroups.get(normalizedUrl) || {
        leads: [],
        uniqueContacts: new Set<string>(),
        emailToPhone: new Map<string, string | null>(),
      };
      
      existing.leads.push(lead);
      const normalizedEmail = lead.email.toLowerCase().trim();
      existing.uniqueContacts.add(normalizedEmail);
      existing.emailToPhone.set(normalizedEmail, lead.phone);
      pageGroups.set(normalizedUrl, existing);
    }
    
    // Calculate conversions for each page
    const stats: LandingPageConversion[] = [];
    
    for (const [normalizedUrl, group] of pageGroups) {
      let convertedLeads = 0;
      let totalRevenue = 0;
      let currency = 'BRL';
      const countedContacts = new Set<string>(); // Avoid double-counting
      
      for (const email of group.uniqueContacts) {
        if (countedContacts.has(email)) continue;
        
        // Try matching by email first
        const matchByEmail = transactionsByEmail.get(email);
        if (matchByEmail) {
          convertedLeads++;
          totalRevenue += matchByEmail.totalValue;
          currency = matchByEmail.currency;
          countedContacts.add(email);
          continue;
        }
        
        // Try matching by phone
        const leadPhone = group.emailToPhone.get(email);
        const normalizedLeadPhone = normalizePhone(leadPhone);
        if (normalizedLeadPhone) {
          const matchByPhone = transactionsByPhone.get(normalizedLeadPhone);
          if (matchByPhone) {
            convertedLeads++;
            totalRevenue += matchByPhone.totalValue;
            currency = matchByPhone.currency;
            countedContacts.add(email);
          }
        }
      }
      
      const uniqueEmails = group.uniqueContacts.size;
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
  }, [leads, transactionsByEmail, transactionsByPhone]);

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
