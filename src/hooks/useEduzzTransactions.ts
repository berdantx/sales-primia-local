import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EduzzTransaction {
  id: string;
  sale_id: string;
  invoice_code: string | null;
  product: string | null;
  product_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  sale_value: number;
  currency: string;
  original_currency: string | null;
  original_value: number | null;
  sale_date: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  source: string;
  created_at: string;
  client_id: string | null;
  status: string;
  cancelled_at: string | null;
}

export interface EduzzTransactionFilters {
  startDate?: Date;
  endDate?: Date;
  search?: string;
  clientId?: string | null;
}

export function useEduzzTransactions(filters?: EduzzTransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['eduzz-transactions', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      const PAGE_SIZE = 1000;
      let allTransactions: EduzzTransaction[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('eduzz_transactions')
          .select('*')
          .order('sale_date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        // Apply filters
        if (filters?.clientId) {
          query = query.eq('client_id', filters.clientId);
        }
        if (filters?.startDate) {
          query = query.gte('sale_date', filters.startDate.toISOString());
        }
        if (filters?.endDate) {
          query = query.lte('sale_date', filters.endDate.toISOString());
        }
        if (filters?.search) {
          query = query.or(`buyer_name.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%,product.ilike.%${filters.search}%,sale_id.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching Eduzz transactions:', error);
          throw error;
        }

        if (data) {
          allTransactions = [...allTransactions, ...data];
          hasMore = data.length === PAGE_SIZE;
          from += PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allTransactions;
    },
    enabled: !!user,
  });
}

export function useEduzzTransactionStats(filters?: EduzzTransactionFilters) {
  const { data: transactions, isLoading } = useEduzzTransactions(filters);

  const stats = {
    totalBRL: 0,
    totalTransactions: 0,
    topProducts: [] as { product: string; total: number; count: number }[],
  };

  if (transactions) {
    const paidTransactions = transactions.filter(t => t.status !== 'cancelado');
    stats.totalBRL = paidTransactions.reduce((sum, t) => sum + Number(t.sale_value), 0);
    stats.totalTransactions = transactions.length;

    // Calculate top products
    const productMap = new Map<string, { total: number; count: number }>();
    transactions.forEach(t => {
      const product = t.product || 'Desconhecido';
      const current = productMap.get(product) || { total: 0, count: 0 };
      productMap.set(product, {
        total: current.total + Number(t.sale_value),
        count: current.count + 1,
      });
    });

    stats.topProducts = Array.from(productMap.entries())
      .map(([product, data]) => ({ product, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  return { stats, isLoading };
}
