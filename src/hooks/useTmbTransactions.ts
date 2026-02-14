import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TmbTransaction {
  id: string;
  order_id: string;
  product: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  ticket_value: number;
  currency: string;
  effective_date: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  source: string;
  created_at: string;
  status: string;
  cancelled_at: string | null;
}

export interface TmbTransactionFilters {
  startDate?: Date;
  endDate?: Date;
  search?: string;
  clientId?: string | null;
}

export function useTmbTransactions(filters?: TmbTransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tmb-transactions', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      const PAGE_SIZE = 1000;
      let allTransactions: TmbTransaction[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('tmb_transactions')
          .select('*')
          .order('effective_date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        // Apply filters
        if (filters?.clientId) {
          query = query.eq('client_id', filters.clientId);
        }
        if (filters?.startDate) {
          query = query.gte('effective_date', filters.startDate.toISOString());
        }
        if (filters?.endDate) {
          query = query.lte('effective_date', filters.endDate.toISOString());
        }
        if (filters?.search) {
          query = query.or(`buyer_name.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%,product.ilike.%${filters.search}%,order_id.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching TMB transactions:', error);
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

export function useTmbTransactionStats(filters?: TmbTransactionFilters) {
  const { data: transactions, isLoading } = useTmbTransactions(filters);

  const stats = {
    totalBRL: 0,
    totalTransactions: 0,
    topProducts: [] as { product: string; total: number; count: number }[],
  };

  if (transactions) {
    stats.totalBRL = transactions.reduce((sum, t) => sum + Number(t.ticket_value), 0);
    stats.totalTransactions = transactions.length;

    // Calculate top products
    const productMap = new Map<string, { total: number; count: number }>();
    transactions.forEach(t => {
      const product = t.product || 'Desconhecido';
      const current = productMap.get(product) || { total: 0, count: 0 };
      productMap.set(product, {
        total: current.total + Number(t.ticket_value),
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
