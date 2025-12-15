import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TmbTransactionFilters {
  startDate?: Date;
  endDate?: Date;
}

export interface TmbStats {
  totalBRL: number;
  totalTransactions: number;
  transactionsWithoutDate: number;
}

export interface TmbTopCustomer {
  email: string;
  name: string;
  totalValue: number;
  totalPurchases: number;
  currency: string;
}

export function useTmbTransactionStatsOptimized(filters?: TmbTransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tmb-transaction-stats', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tmb_transaction_stats', {
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching TMB stats:', error);
        throw error;
      }

      const result = data as {
        total_brl: number;
        total_transactions: number;
        transactions_without_date: number;
      };

      return {
        totalBRL: result?.total_brl || 0,
        totalTransactions: result?.total_transactions || 0,
        transactionsWithoutDate: result?.transactions_without_date || 0,
      } as TmbStats;
    },
    enabled: !!user,
  });
}

export function useTmbTopCustomersOptimized(filters?: TmbTransactionFilters, limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tmb-top-customers', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tmb_top_customers', {
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_limit: limit,
      });

      if (error) {
        console.error('Error fetching TMB top customers:', error);
        throw error;
      }

      return (data as unknown as TmbTopCustomer[]) || [];
    },
    enabled: !!user,
  });
}

export function useTmbSalesByDateOptimized(filters?: TmbTransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tmb-sales-by-date', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tmb_sales_by_date', {
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching TMB sales by date:', error);
        throw error;
      }

      return (data || {}) as Record<string, Record<string, number>>;
    },
    enabled: !!user,
  });
}
