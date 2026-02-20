import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyGroup {
  currency: string;
  count: number;
  totalConverted: number;
}

export function useCurrencyOverview() {
  const hotmartQuery = useQuery({
    queryKey: ['currency-overview-hotmart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('original_currency, original_value, computed_value')
        .not('original_currency', 'is', null);

      if (error) throw error;

      const grouped: Record<string, CurrencyGroup> = {};
      for (const row of data || []) {
        const cur = row.original_currency!;
        if (!grouped[cur]) grouped[cur] = { currency: cur, count: 0, totalConverted: 0 };
        grouped[cur].count++;
        grouped[cur].totalConverted += Number(row.computed_value || 0);
      }
      return Object.values(grouped);
    },
    staleTime: 1000 * 60 * 5,
  });

  const eduzzQuery = useQuery({
    queryKey: ['currency-overview-eduzz'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eduzz_transactions')
        .select('original_currency, original_value, sale_value')
        .not('original_currency', 'is', null);

      if (error) throw error;

      const grouped: Record<string, CurrencyGroup> = {};
      for (const row of data || []) {
        const cur = row.original_currency!;
        if (!grouped[cur]) grouped[cur] = { currency: cur, count: 0, totalConverted: 0 };
        grouped[cur].count++;
        grouped[cur].totalConverted += Number(row.sale_value || 0);
      }
      return Object.values(grouped);
    },
    staleTime: 1000 * 60 * 5,
  });

  // Merge both platforms
  const allGroups: CurrencyGroup[] = [];
  const merged: Record<string, CurrencyGroup> = {};

  for (const group of [...(hotmartQuery.data || []), ...(eduzzQuery.data || [])]) {
    if (!merged[group.currency]) {
      merged[group.currency] = { ...group };
    } else {
      merged[group.currency].count += group.count;
      merged[group.currency].totalConverted += group.totalConverted;
    }
  }

  return {
    currencies: Object.values(merged).sort((a, b) => b.count - a.count),
    isLoading: hotmartQuery.isLoading || eduzzQuery.isLoading,
    totalTransactions: Object.values(merged).reduce((sum, g) => sum + g.count, 0),
  };
}
