import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EduzzTransactionFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
}

export interface EduzzStats {
  totalBRL: number;
  totalUSD: number;
  totalTransactions: number;
  transactionsWithoutDate: number;
}

export interface EduzzTopCustomer {
  email: string;
  name: string;
  totalValue: number;
  totalPurchases: number;
  currency: string;
}

export function useEduzzTransactionStatsOptimized(filters?: EduzzTransactionFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('eduzz-stats-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eduzz_transactions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['eduzz-transaction-stats'] });
        queryClient.invalidateQueries({ queryKey: ['eduzz-top-customers'] });
        queryClient.invalidateQueries({ queryKey: ['eduzz-sales-by-date'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['eduzz-transaction-stats', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_eduzz_transaction_stats', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching Eduzz stats:', error);
        throw error;
      }

      const result = data as {
        totalByCurrency: Record<string, number>;
        totalTransactions: number;
        transactionsWithoutDate: number;
      };

      return {
        totalBRL: result?.totalByCurrency?.BRL || 0,
        totalUSD: result?.totalByCurrency?.USD || 0,
        totalTransactions: result?.totalTransactions || 0,
        transactionsWithoutDate: result?.transactionsWithoutDate || 0,
      } as EduzzStats;
    },
    enabled: !!user,
  });
}

export function useEduzzTopCustomersOptimized(filters?: EduzzTransactionFilters, limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['eduzz-top-customers', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.clientId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_eduzz_top_customers', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
        p_limit: limit,
      });

      if (error) {
        console.error('Error fetching Eduzz top customers:', error);
        throw error;
      }

      // Transform snake_case to camelCase to match other hooks
      const rawData = (data || []) as Array<{ email: string; name: string; total_value: number; total_purchases: number }>;
      return rawData.map(item => ({
        email: item.email,
        name: item.name,
        totalValue: item.total_value,
        totalPurchases: item.total_purchases,
        currency: 'BRL',
      })) as EduzzTopCustomer[];
    },
    enabled: !!user,
  });
}

export function useEduzzSalesByDateOptimized(filters?: EduzzTransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['eduzz-sales-by-date', user?.id, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_eduzz_sales_by_date', {
        p_client_id: filters?.clientId || null,
        p_start_date: filters?.startDate?.toISOString() || null,
        p_end_date: filters?.endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching Eduzz sales by date:', error);
        throw error;
      }

      return (data || {}) as Record<string, Record<string, number>>;
    },
    enabled: !!user,
  });
}
