import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HotmartTransaction } from '@/lib/parsers/hotmartParser';
import { TmbTransaction } from '@/lib/parsers/tmbParser';
import { EduzzTransaction } from '@/lib/parsers/eduzzParser';

const BATCH_SIZE = 20;
const MAX_RETRIES = 2;

interface ImportProgress {
  current: number;
  total: number;
}

interface ImportResult {
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
}

async function insertBatchWithRetry(
  tableName: 'transactions' | 'tmb_transactions' | 'eduzz_transactions',
  records: Record<string, unknown>[],
  retries = MAX_RETRIES
): Promise<{ success: number; errors: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data } = await (supabase.from(tableName) as any).insert(records).select('id');

  if (!error) {
    return { success: data?.length ?? records.length, errors: 0 };
  }

  if (retries > 0 && records.length > 1) {
    const mid = Math.ceil(records.length / 2);
    const r1 = await insertBatchWithRetry(tableName, records.slice(0, mid), retries - 1);
    const r2 = await insertBatchWithRetry(tableName, records.slice(mid), retries - 1);
    return { success: r1.success + r2.success, errors: r1.errors + r2.errors };
  }

  console.error(`Batch insert error on ${tableName}:`, error);
  return { success: 0, errors: records.length };
}

async function fetchExistingHotmartIds(userId: string, clientId: string | null): Promise<Set<string>> {
  let query = supabase.from('transactions').select('transaction_code').eq('user_id', userId);
  if (clientId) query = query.eq('client_id', clientId);
  const { data } = await query;
  return new Set(data?.map(r => r.transaction_code) ?? []);
}

async function fetchExistingTmbIds(userId: string, clientId: string | null): Promise<Set<string>> {
  let query = supabase.from('tmb_transactions').select('order_id').eq('user_id', userId);
  if (clientId) query = query.eq('client_id', clientId);
  const { data } = await query;
  return new Set(data?.map(r => r.order_id) ?? []);
}

async function fetchExistingEduzzIds(userId: string, clientId: string | null): Promise<Set<string>> {
  let query = supabase.from('eduzz_transactions').select('sale_id').eq('user_id', userId);
  if (clientId) query = query.eq('client_id', clientId);
  const { data } = await query;
  return new Set(data?.map(r => r.sale_id) ?? []);
}

export function useImportTransactions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 0 });

  const importHotmart = async (
    transactions: HotmartTransaction[],
    userId: string,
    importId: string,
    clientId: string | null
  ): Promise<ImportResult> => {
    const existing = await fetchExistingHotmartIds(userId, clientId);
    const newTx = transactions.filter(t => !existing.has(t.transaction_code));
    const duplicateCount = transactions.length - newTx.length;

    setProgress({ current: 0, total: newTx.length });
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < newTx.length; i += BATCH_SIZE) {
      const batch = newTx.slice(i, i + BATCH_SIZE);
      const records = batch.map(t => ({
        user_id: userId,
        import_id: importId,
        transaction_code: t.transaction_code,
        product: t.product,
        currency: t.currency,
        country: t.country,
        gross_value_with_taxes: t.gross_value_with_taxes,
        sck_code: t.sck_code,
        payment_method: t.payment_method,
        total_installments: t.total_installments,
        billing_type: t.billing_type,
        computed_value: t.computed_value,
        projected_value: t.projected_value,
        buyer_name: t.buyer_name,
        buyer_email: t.buyer_email,
        purchase_date: t.purchase_date?.toISOString() || null,
        source: 'hotmart',
        client_id: clientId,
      }));

      const result = await insertBatchWithRetry('transactions', records);
      importedCount += result.success;
      errorCount += result.errors;
      setProgress({ current: Math.min(i + BATCH_SIZE, newTx.length), total: newTx.length });
    }

    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    return { importedCount, duplicateCount, errorCount };
  };

  const importTmb = async (
    transactions: TmbTransaction[],
    userId: string,
    importId: string,
    clientId: string | null
  ): Promise<ImportResult> => {
    const existing = await fetchExistingTmbIds(userId, clientId);
    const newTx = transactions.filter(t => !existing.has(t.order_id));
    const duplicateCount = transactions.length - newTx.length;

    setProgress({ current: 0, total: newTx.length });
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < newTx.length; i += BATCH_SIZE) {
      const batch = newTx.slice(i, i + BATCH_SIZE);
      const records = batch.map(t => ({
        user_id: userId,
        import_id: importId,
        order_id: t.order_id,
        product: t.product,
        buyer_name: t.buyer_name,
        buyer_email: t.buyer_email,
        ticket_value: t.ticket_value,
        currency: 'BRL',
        effective_date: t.effective_date?.toISOString() || null,
        utm_source: t.utm_source || null,
        utm_medium: t.utm_medium || null,
        utm_campaign: t.utm_campaign || null,
        utm_content: t.utm_content || null,
        source: 'tmb',
        client_id: clientId,
      }));

      const result = await insertBatchWithRetry('tmb_transactions', records);
      importedCount += result.success;
      errorCount += result.errors;
      setProgress({ current: Math.min(i + BATCH_SIZE, newTx.length), total: newTx.length });
    }

    queryClient.invalidateQueries({ queryKey: ['tmb-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['tmb-transaction-stats'] });
    return { importedCount, duplicateCount, errorCount };
  };

  const importEduzz = async (
    transactions: EduzzTransaction[],
    userId: string,
    importId: string,
    clientId: string | null
  ): Promise<ImportResult> => {
    const existing = await fetchExistingEduzzIds(userId, clientId);
    const newTx = transactions.filter(t => !existing.has(t.sale_id));
    const duplicateCount = transactions.length - newTx.length;

    setProgress({ current: 0, total: newTx.length });
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < newTx.length; i += BATCH_SIZE) {
      const batch = newTx.slice(i, i + BATCH_SIZE);
      const records = batch.map(t => ({
        user_id: userId,
        import_id: importId,
        sale_id: t.sale_id,
        invoice_code: t.invoice_code || null,
        product: t.product || null,
        product_id: t.product_id || null,
        buyer_name: t.buyer_name || null,
        buyer_email: t.buyer_email || null,
        buyer_phone: t.buyer_phone || null,
        sale_value: t.sale_value || 0,
        currency: 'BRL',
        sale_date: t.sale_date?.toISOString() || null,
        utm_source: t.utm_source || null,
        utm_medium: t.utm_medium || null,
        utm_campaign: t.utm_campaign || null,
        utm_content: t.utm_content || null,
        source: 'eduzz',
        client_id: clientId,
      }));

      const result = await insertBatchWithRetry('eduzz_transactions', records);
      importedCount += result.success;
      errorCount += result.errors;
      setProgress({ current: Math.min(i + BATCH_SIZE, newTx.length), total: newTx.length });
    }

    queryClient.invalidateQueries({ queryKey: ['eduzz-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['eduzz-transaction-stats'] });
    return { importedCount, duplicateCount, errorCount };
  };

  return { progress, importHotmart, importTmb, importEduzz };
}
