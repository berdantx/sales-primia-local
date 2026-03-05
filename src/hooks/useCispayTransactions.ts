import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CispayTransaction {
  id: string;
  sale_id: string;
  product: string | null;
  product_code: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  sale_value: number;
  currency: string;
  sale_date: string | null;
  turma: string | null;
  promotion: string | null;
  unit: string | null;
  enrollment_type: string | null;
  status: string;
  source: string;
  created_at: string;
  client_id: string | null;
}

export interface CispayTransactionFilters {
  startDate?: Date;
  endDate?: Date;
  search?: string;
  clientId?: string | null;
}

export function useCispayTransactions(filters?: CispayTransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cispay-transactions', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      const PAGE_SIZE = 1000;
      let allTransactions: CispayTransaction[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from as any)('cispay_transactions')
          .select('*')
          .order('sale_date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

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
          console.error('Error fetching CIS PAY transactions:', error);
          throw error;
        }

        if (data) {
          allTransactions = [...allTransactions, ...(data as unknown as CispayTransaction[])];
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
