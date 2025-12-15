import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  billingType?: string | null;
  paymentMethod?: string | null;
  sckCode?: string | null;
  product?: string | null;
}

export interface CountryCurrencyStats {
  currency: string;
  total: number;
  count: number;
}

export interface TransactionStats {
  totalByCurrency: Record<string, number>;
  totalByCountry: Record<string, number>;
  totalByCountryCurrency: Record<string, CountryCurrencyStats>;
  totalTransactions: number;
  transactionsWithoutDate: number;
}

export interface TopCustomer {
  email: string;
  name: string;
  totalValue: number;
  totalPurchases: number;
  currency: string;
}

export interface DateRange {
  min_date: string | null;
  max_date: string | null;
}

export function useTransactionStatsOptimized(filters?: TransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'transaction-stats-optimized', 
      user?.id, 
      filters?.startDate?.toISOString(), 
      filters?.endDate?.toISOString(),
      filters?.billingType,
      filters?.paymentMethod,
      filters?.sckCode,
      filters?.product,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_transaction_stats', {
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_billing_type: filters?.billingType || null,
        p_payment_method: filters?.paymentMethod || null,
        p_sck_code: filters?.sckCode || null,
        p_product: filters?.product || null,
      });

      if (error) throw error;
      
      const result = data as unknown as {
        total_by_currency: Record<string, number> | null;
        total_by_country: Record<string, number> | null;
        total_by_country_currency: Record<string, CountryCurrencyStats> | null;
        total_transactions: number;
        transactions_without_date: number;
      };
      
      return {
        totalByCurrency: result?.total_by_currency || {},
        totalByCountry: result?.total_by_country || {},
        totalByCountryCurrency: result?.total_by_country_currency || {},
        totalTransactions: result?.total_transactions || 0,
        transactionsWithoutDate: result?.transactions_without_date || 0,
      } as TransactionStats;
    },
    enabled: !!user,
  });
}

export function useTopCustomersOptimized(filters?: TransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'top-customers-optimized', 
      user?.id, 
      filters?.startDate?.toISOString(), 
      filters?.endDate?.toISOString(),
      filters?.billingType,
      filters?.paymentMethod,
      filters?.sckCode,
      filters?.product,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_customers', {
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_limit: 10,
        p_billing_type: filters?.billingType || null,
        p_payment_method: filters?.paymentMethod || null,
        p_sck_code: filters?.sckCode || null,
        p_product: filters?.product || null,
      });

      if (error) throw error;
      return (data as unknown as TopCustomer[]) || [];
    },
    enabled: !!user,
  });
}

export function useSalesByDateOptimized(filters?: TransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'sales-by-date-optimized', 
      user?.id, 
      filters?.startDate?.toISOString(), 
      filters?.endDate?.toISOString(),
      filters?.billingType,
      filters?.paymentMethod,
      filters?.sckCode,
      filters?.product,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_by_date', {
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_billing_type: filters?.billingType || null,
        p_payment_method: filters?.paymentMethod || null,
        p_sck_code: filters?.sckCode || null,
        p_product: filters?.product || null,
      });

      if (error) throw error;
      return (data as unknown as Record<string, Record<string, number>>) || {};
    },
    enabled: !!user,
  });
}

export function useTransactionDateRange() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transaction-date-range', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_transaction_date_range');

      if (error) throw error;
      return (data as unknown as DateRange) || { min_date: null, max_date: null };
    },
    enabled: !!user,
  });
}
