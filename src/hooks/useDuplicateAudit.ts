import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type Platform = 'hotmart' | 'tmb' | 'eduzz';

export interface DuplicateRecord {
  id: string;
  email: string | null;
  product: string | null;
  value: number;
  source: string | null;
  date: string | null;
  buyer_name: string | null;
}

export interface DuplicateGroup {
  platform: Platform;
  identifier: string;
  clientId: string | null;
  records: DuplicateRecord[];
  inflatedValue: number;
}

export interface DuplicateSummary {
  hotmart: number;
  tmb: number;
  eduzz: number;
  totalInflated: number;
}

function groupDuplicates<T extends { client_id: string | null }>(
  data: T[],
  getKey: (item: T) => string,
  platform: Platform,
  toRecord: (item: T) => DuplicateRecord,
  getValue: (item: T) => number
): DuplicateGroup[] {
  const groups = new Map<string, T[]>();

  for (const item of data) {
    const key = `${getKey(item)}__${item.client_id ?? 'null'}`;
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [, items] of groups) {
    if (items.length > 1) {
      const value = getValue(items[0]);
      duplicates.push({
        platform,
        identifier: getKey(items[0]),
        clientId: items[0].client_id,
        records: items.map(toRecord),
        inflatedValue: value * (items.length - 1),
      });
    }
  }
  return duplicates;
}

export function useDuplicateAudit() {
  return useQuery({
    queryKey: ['duplicate-audit'],
    queryFn: async () => {
      // Fetch all 3 tables
      const [hotmart, tmb, eduzz] = await Promise.all([
        supabase.from('transactions').select('id, transaction_code, client_id, buyer_email, product, computed_value, source, purchase_date, buyer_name').then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from('tmb_transactions').select('id, order_id, client_id, buyer_email, product, ticket_value, source, effective_date, buyer_name').then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from('eduzz_transactions').select('id, sale_id, client_id, buyer_email, product, sale_value, source, sale_date, buyer_name').then(r => { if (r.error) throw r.error; return r.data; }),
      ]);

      const hotmartDups = groupDuplicates(
        hotmart, t => t.transaction_code, 'hotmart',
        t => ({ id: t.id, email: t.buyer_email, product: t.product, value: t.computed_value, source: t.source, date: t.purchase_date, buyer_name: t.buyer_name }),
        t => t.computed_value
      );

      const tmbDups = groupDuplicates(
        tmb, t => t.order_id, 'tmb',
        t => ({ id: t.id, email: t.buyer_email, product: t.product, value: t.ticket_value, source: t.source, date: t.effective_date, buyer_name: t.buyer_name }),
        t => t.ticket_value
      );

      const eduzzDups = groupDuplicates(
        eduzz, t => t.sale_id, 'eduzz',
        t => ({ id: t.id, email: t.buyer_email, product: t.product, value: t.sale_value, source: t.source, date: t.sale_date, buyer_name: t.buyer_name }),
        t => t.sale_value
      );

      const allDuplicates = [...hotmartDups, ...tmbDups, ...eduzzDups];

      const summary: DuplicateSummary = {
        hotmart: hotmartDups.length,
        tmb: tmbDups.length,
        eduzz: eduzzDups.length,
        totalInflated: allDuplicates.reduce((sum, g) => sum + g.inflatedValue, 0),
      };

      return { duplicates: allDuplicates, summary };
    },
    staleTime: 1000 * 60 * 5,
  });
}

function getTable(platform: Platform) {
  switch (platform) {
    case 'hotmart': return 'transactions' as const;
    case 'tmb': return 'tmb_transactions' as const;
    case 'eduzz': return 'eduzz_transactions' as const;
  }
}

export function useResolveDuplicate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ platform, idsToDelete }: { platform: Platform; idsToDelete: string[] }) => {
      const table = getTable(platform);
      const { error } = await supabase.from(table).delete().in('id', idsToDelete);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-audit'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['tmb-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['eduzz-transactions'] });
      toast({ title: 'Duplicata resolvida', description: 'Os registros duplicados foram removidos com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao resolver duplicata', description: error.message, variant: 'destructive' });
    },
  });
}
