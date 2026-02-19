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

export function useDuplicateAudit(clientId: string | null) {
  return useQuery({
    queryKey: ['duplicate-audit', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      // Fetch all 3 tables filtered by clientId
      const [hotmart, tmb, eduzz] = await Promise.all([
        supabase.from('transactions').select('id, transaction_code, client_id, buyer_email, product, computed_value, source, purchase_date, buyer_name').eq('client_id', clientId!).then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from('tmb_transactions').select('id, order_id, client_id, buyer_email, product, ticket_value, source, effective_date, buyer_name').eq('client_id', clientId!).then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from('eduzz_transactions').select('id, sale_id, client_id, buyer_email, product, sale_value, source, sale_date, buyer_name').eq('client_id', clientId!).then(r => { if (r.error) throw r.error; return r.data; }),
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
    mutationFn: async ({ platform, idsToDelete, justification, auditType = 'id_duplicate' }: { platform: Platform; idsToDelete: string[]; justification: string; auditType?: string }) => {
      const table = getTable(platform);

      // 1. Fetch full records before deleting
      const { data: records, error: fetchErr } = await supabase.from(table).select('*').in('id', idsToDelete);
      if (fetchErr) throw fetchErr;

      // 2. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 3. Insert audit logs
      if (records && records.length > 0) {
        const identifierKey = platform === 'hotmart' ? 'transaction_code' : platform === 'tmb' ? 'order_id' : 'sale_id';
        const logs = records.map((r: any) => ({
          transaction_id: r.id,
          platform,
          transaction_identifier: r[identifierKey],
          client_id: r.client_id,
          deleted_by: user.id,
          justification,
          transaction_data: r,
          audit_type: auditType,
        }));
        const { error: logErr } = await supabase.from('duplicate_deletion_logs').insert(logs);
        if (logErr) throw logErr;

        // 4. For Eduzz, also insert into eduzz_transaction_deletion_logs
        if (platform === 'eduzz') {
          const eduzzLogs = records.map((r: any) => ({
            transaction_id: r.id,
            sale_id: r.sale_id,
            client_id: r.client_id,
            deleted_by: user.id,
            justification,
            transaction_data: r,
          }));
          const { error: eduzzLogErr } = await supabase.from('eduzz_transaction_deletion_logs').insert(eduzzLogs);
          if (eduzzLogErr) throw eduzzLogErr;
        }
      }

      // 5. Delete records
      const { error } = await supabase.from(table).delete().in('id', idsToDelete);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-audit'] });
      queryClient.invalidateQueries({ queryKey: ['email-duplicate-audit'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['tmb-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['eduzz-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['eduzz-deletion-logs'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-deletion-logs'] });
      toast({ title: 'Duplicata resolvida', description: 'Os registros duplicados foram removidos com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao resolver duplicata', description: error.message, variant: 'destructive' });
    },
  });
}

// === Email Duplicate Audit ===

export interface EmailDuplicateRecord {
  id: string;
  platform: Platform;
  transactionId: string; // sale_id, transaction_code, order_id
  email: string;
  product: string | null;
  value: number;
  source: string | null;
  date: string | null;
  status: string;
  buyer_name: string | null;
  billing_type: string | null;
  recurrence_number: number | null;
}

export interface EmailDuplicateGroup {
  email: string;
  product: string | null;
  clientId: string | null;
  platform: Platform;
  records: EmailDuplicateRecord[];
  inflatedValue: number;
  totalValue: number;
  isProbablyInstallments: boolean;
}

export interface EmailDuplicateSummary {
  hotmart: number;
  tmb: number;
  eduzz: number;
  totalInflated: number;
}

function groupByEmail<T extends { client_id: string | null }>(
  data: T[],
  platform: Platform,
  getEmail: (item: T) => string | null,
  getProduct: (item: T) => string | null,
  toRecord: (item: T) => EmailDuplicateRecord,
  getValue: (item: T) => number
): EmailDuplicateGroup[] {
  const groups = new Map<string, T[]>();

  for (const item of data) {
    const email = getEmail(item)?.toLowerCase().trim();
    if (!email) continue;
    const product = getProduct(item) ?? '';
    const key = `${email}__${product}__${item.client_id ?? 'null'}`;
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }

  const duplicates: EmailDuplicateGroup[] = [];
  for (const [, items] of groups) {
    if (items.length <= 1) continue;

    const records = items.map(toRecord);
    const values = items.map(getValue);
    const totalValue = values.reduce((s, v) => s + v, 0);
    const maxValue = Math.max(...values);

    // For Hotmart: check if recurrence_number varies (likely installments)
    let isProbablyInstallments = false;
    if (platform === 'hotmart') {
      const recurrences = new Set(records.map(r => r.recurrence_number).filter(n => n != null));
      const billingTypes = new Set(records.map(r => r.billing_type?.toLowerCase()).filter(Boolean));
      isProbablyInstallments = recurrences.size > 1 || billingTypes.has('recurrence');
    }

    duplicates.push({
      email: getEmail(items[0])?.toLowerCase().trim() ?? '',
      product: getProduct(items[0]),
      clientId: items[0].client_id,
      platform,
      records,
      inflatedValue: totalValue - maxValue,
      totalValue,
      isProbablyInstallments,
    });
  }

  return duplicates;
}

export function useEmailDuplicateAudit(clientId: string | null) {
  return useQuery({
    queryKey: ['email-duplicate-audit', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [hotmart, tmb, eduzz] = await Promise.all([
        supabase.from('transactions').select('id, transaction_code, client_id, buyer_email, product, computed_value, source, purchase_date, buyer_name, status:subscription_status, billing_type, recurrence_number').eq('client_id', clientId!).then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from('tmb_transactions').select('id, order_id, client_id, buyer_email, product, ticket_value, source, effective_date, buyer_name, status').eq('client_id', clientId!).then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from('eduzz_transactions').select('id, sale_id, client_id, buyer_email, product, sale_value, source, sale_date, buyer_name, status').eq('client_id', clientId!).then(r => { if (r.error) throw r.error; return r.data; }),
      ]);

      const hotmartDups = groupByEmail(
        hotmart, 'hotmart',
        t => t.buyer_email, t => t.product,
        t => ({ id: t.id, platform: 'hotmart' as Platform, transactionId: t.transaction_code, email: t.buyer_email ?? '', product: t.product, value: t.computed_value, source: t.source, date: t.purchase_date, status: t.status ?? '', buyer_name: t.buyer_name, billing_type: t.billing_type, recurrence_number: t.recurrence_number }),
        t => t.computed_value
      );

      const tmbDups = groupByEmail(
        tmb, 'tmb',
        t => t.buyer_email, t => t.product,
        t => ({ id: t.id, platform: 'tmb' as Platform, transactionId: t.order_id, email: t.buyer_email ?? '', product: t.product, value: t.ticket_value, source: t.source, date: t.effective_date, status: t.status ?? '', buyer_name: t.buyer_name, billing_type: null, recurrence_number: null }),
        t => t.ticket_value
      );

      const eduzzDups = groupByEmail(
        eduzz, 'eduzz',
        t => t.buyer_email, t => t.product,
        t => ({ id: t.id, platform: 'eduzz' as Platform, transactionId: t.sale_id, email: t.buyer_email ?? '', product: t.product, value: t.sale_value, source: t.source, date: t.sale_date, status: t.status ?? '', buyer_name: t.buyer_name, billing_type: null, recurrence_number: null }),
        t => t.sale_value
      );

      const allDuplicates = [...hotmartDups, ...tmbDups, ...eduzzDups]
        .sort((a, b) => b.inflatedValue - a.inflatedValue);

      const summary: EmailDuplicateSummary = {
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

export function useResolveEmailDuplicate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deletions, justification }: { deletions: { platform: Platform; ids: string[] }[]; justification: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      for (const { platform, ids } of deletions) {
        if (ids.length === 0) continue;
        const table = getTable(platform);

        // 1. Fetch full records
        const { data: records, error: fetchErr } = await supabase.from(table).select('*').in('id', ids);
        if (fetchErr) throw fetchErr;

        // 2. Insert audit logs
        if (records && records.length > 0) {
          const identifierKey = platform === 'hotmart' ? 'transaction_code' : platform === 'tmb' ? 'order_id' : 'sale_id';
          const logs = records.map((r: any) => ({
            transaction_id: r.id,
            platform,
            transaction_identifier: r[identifierKey],
            client_id: r.client_id,
            deleted_by: user.id,
            justification,
            transaction_data: r,
            audit_type: 'email_duplicate',
          }));
          const { error: logErr } = await supabase.from('duplicate_deletion_logs').insert(logs);
          if (logErr) throw logErr;

          // For Eduzz, also insert into eduzz_transaction_deletion_logs
          if (platform === 'eduzz') {
            const eduzzLogs = records.map((r: any) => ({
              transaction_id: r.id,
              sale_id: r.sale_id,
              client_id: r.client_id,
              deleted_by: user.id,
              justification,
              transaction_data: r,
            }));
            const { error: eduzzLogErr } = await supabase.from('eduzz_transaction_deletion_logs').insert(eduzzLogs);
            if (eduzzLogErr) throw eduzzLogErr;
          }
        }

        // 3. Delete records
        const { error } = await supabase.from(table).delete().in('id', ids);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-duplicate-audit'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-audit'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['tmb-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['eduzz-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['eduzz-deletion-logs'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-deletion-logs'] });
      toast({ title: 'Duplicatas resolvidas', description: 'Os registros selecionados foram removidos.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao resolver duplicatas', description: error.message, variant: 'destructive' });
    },
  });
}
