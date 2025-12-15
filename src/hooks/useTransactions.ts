import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Transaction {
  id: string;
  transaction_code: string;
  product: string | null;
  currency: string;
  country: string | null;
  gross_value_with_taxes: number;
  sck_code: string | null;
  payment_method: string | null;
  total_installments: number | null;
  billing_type: string | null;
  computed_value: number;
  buyer_name: string | null;
  buyer_email: string | null;
  purchase_date: string | null;
  created_at: string;
}

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  country?: string;
  search?: string;
}

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();

  // Serialize filters to prevent reference issues with queryKey
  const filterKey = filters ? {
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    currency: filters.currency,
    country: filters.country,
    search: filters.search,
  } : null;

  return useQuery({
    queryKey: ['transactions', user?.id, filterKey],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('purchase_date', { ascending: false, nullsFirst: false })
        .range(0, 50000);

      // Only apply date filters if both dates are provided
      if (filters?.startDate && filters?.endDate) {
        query = query.gte('purchase_date', filters.startDate.toISOString());
        query = query.lte('purchase_date', filters.endDate.toISOString());
      }
      if (filters?.currency) {
        query = query.eq('currency', filters.currency);
      }
      if (filters?.country) {
        query = query.eq('country', filters.country);
      }
      if (filters?.search) {
        query = query.or(`product.ilike.%${filters.search}%,buyer_name.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
}

export function useTransactionStats(filters?: TransactionFilters) {
  const { data: transactions, isLoading } = useTransactions(filters);

  const stats = transactions ? {
    totalByCurrency: transactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + Number(t.computed_value);
      return acc;
    }, {} as Record<string, number>),
    
    totalByCountry: transactions.reduce((acc, t) => {
      const country = t.country || 'Desconhecido';
      acc[country] = (acc[country] || 0) + Number(t.computed_value);
      return acc;
    }, {} as Record<string, number>),
    
    totalTransactions: transactions.length,
    
    topCustomers: Object.values(
      transactions.reduce((acc, t) => {
        const email = t.buyer_email || 'unknown';
        if (!acc[email]) {
          acc[email] = {
            email,
            name: t.buyer_name || email,
            totalValue: 0,
            totalPurchases: 0,
            currency: t.currency,
          };
        }
        acc[email].totalValue += Number(t.computed_value);
        acc[email].totalPurchases += 1;
        return acc;
      }, {} as Record<string, { email: string; name: string; totalValue: number; totalPurchases: number; currency: string }>)
    ).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10),
    
    salesByDate: transactions.reduce((acc, t) => {
      if (t.purchase_date) {
        const date = t.purchase_date.split('T')[0];
        if (!acc[date]) {
          acc[date] = {};
        }
        acc[date][t.currency] = (acc[date][t.currency] || 0) + Number(t.computed_value);
      }
      return acc;
    }, {} as Record<string, Record<string, number>>),
  } : null;

  return { stats, isLoading };
}
