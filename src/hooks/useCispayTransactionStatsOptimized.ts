import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CispayTransactionFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
}

export interface CispayStats {
  totalBRL: number;
  totalTransactions: number;
  transactionsWithoutDate: number;
}

export interface CispayTopCustomer {
  email: string;
  name: string;
  totalValue: number;
  totalPurchases: number;
  currency: string;
}

export function useCispayTransactionStatsOptimized(filters?: CispayTransactionFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('cispay-stats-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cispay_transactions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['cispay-transaction-stats'] });
        queryClient.invalidateQueries({ queryKey: ['cispay-top-customers'] });
        queryClient.invalidateQueries({ queryKey: ['cispay-sales-by-date'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['cispay-transaction-stats', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.clientId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_cispay_transaction_stats', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching CIS PAY stats:', error);
        throw error;
      }

      const result = data as unknown as {
        totalByCurrency: Record<string, number>;
        totalTransactions: number;
        transactionsWithoutDate: number;
      };

      return {
        totalBRL: result?.totalByCurrency?.BRL || 0,
        totalTransactions: result?.totalTransactions || 0,
        transactionsWithoutDate: result?.transactionsWithoutDate || 0,
      } as CispayStats;
    },
    enabled: !!user,
  });
}

export function useCispayTopCustomersOptimized(filters?: CispayTransactionFilters, limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cispay-top-customers', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.clientId, limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_cispay_top_customers', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_limit: limit,
      });

      if (error) {
        console.error('Error fetching CIS PAY top customers:', error);
        throw error;
      }

      const rawData = (data || []) as unknown as Array<{ email: string; name: string; total_value: number; total_purchases: number }>;
      return rawData.map(item => ({
        email: item.email,
        name: item.name,
        totalValue: item.total_value,
        totalPurchases: item.total_purchases,
        currency: 'BRL',
      })) as CispayTopCustomer[];
    },
    enabled: !!user,
  });
}

export function useCispaySalesByDateOptimized(filters?: CispayTransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cispay-sales-by-date', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.clientId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_cispay_sales_by_date', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching CIS PAY sales by date:', error);
        throw error;
      }

      return (data || {}) as Record<string, Record<string, number>>;
    },
    enabled: !!user,
  });
}
