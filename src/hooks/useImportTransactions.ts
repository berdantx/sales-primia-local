import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HotmartTransaction } from '@/lib/parsers/hotmartParser';
import { TmbTransaction } from '@/lib/parsers/tmbParser';
import { EduzzTransaction } from '@/lib/parsers/eduzzParser';
import { DuplicateMatch } from '@/components/upload/DuplicateReviewDialog';

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
  mergedCount: number;
}

export interface DuplicateScanResult {
  newTransactions: unknown[];
  duplicateMatches: DuplicateMatch[];
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

// ─── Fetch existing records with full data for duplicate comparison ───

const MERGEABLE_HOTMART_FIELDS = [
  'buyer_name', 'buyer_email', 'product', 'sck_code', 'payment_method',
  'billing_type', 'country',
];

const MERGEABLE_TMB_FIELDS = [
  'buyer_name', 'buyer_email', 'buyer_phone', 'product',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
];

const MERGEABLE_EDUZZ_FIELDS = [
  'buyer_name', 'buyer_email', 'buyer_phone', 'product', 'product_id', 'invoice_code',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
];

async function fetchExistingHotmartRecords(
  userId: string,
  clientId: string | null
): Promise<Map<string, Record<string, unknown>>> {
  let query = supabase.from('transactions').select('transaction_code, buyer_name, buyer_email, product, sck_code, payment_method, billing_type, country');
  if (clientId) {
    query = query.eq('client_id', clientId);
  } else {
    query = query.eq('user_id', userId);
  }
  const { data } = await query;
  const map = new Map<string, Record<string, unknown>>();
  data?.forEach(r => map.set(r.transaction_code, r as unknown as Record<string, unknown>));
  return map;
}

async function fetchExistingTmbRecords(
  userId: string,
  clientId: string | null
): Promise<Map<string, Record<string, unknown>>> {
  let query = supabase.from('tmb_transactions').select('order_id, buyer_name, buyer_email, buyer_phone, product, utm_source, utm_medium, utm_campaign, utm_content');
  if (clientId) {
    query = query.eq('client_id', clientId);
  } else {
    query = query.eq('user_id', userId);
  }
  const { data } = await query;
  const map = new Map<string, Record<string, unknown>>();
  data?.forEach(r => map.set(r.order_id, r as unknown as Record<string, unknown>));
  return map;
}

async function fetchExistingEduzzRecords(
  userId: string,
  clientId: string | null
): Promise<Map<string, Record<string, unknown>>> {
  let query = supabase.from('eduzz_transactions').select('sale_id, buyer_name, buyer_email, buyer_phone, product, product_id, invoice_code, utm_source, utm_medium, utm_campaign, utm_content');
  if (clientId) {
    query = query.eq('client_id', clientId);
  } else {
    query = query.eq('user_id', userId);
  }
  const { data } = await query;
  const map = new Map<string, Record<string, unknown>>();
  data?.forEach(r => map.set(r.sale_id, r as unknown as Record<string, unknown>));
  return map;
}

function getEmptyFields(existing: Record<string, unknown>, mergeableFields: string[]): string[] {
  return mergeableFields.filter(f => {
    const val = existing[f];
    return val === null || val === undefined || val === '';
  });
}

// ─── Merge (update only empty fields) ───

async function mergeRecords(
  tableName: string,
  idField: string,
  duplicateMatches: DuplicateMatch[],
  mergeableFields: string[],
  clientId: string | null
): Promise<number> {
  let merged = 0;
  for (const dup of duplicateMatches) {
    if (dup.emptyFieldsInExisting.length === 0) continue;

    const updateData: Record<string, unknown> = {};
    for (const field of dup.emptyFieldsInExisting) {
      const csvVal = dup.csvData[field];
      if (csvVal !== null && csvVal !== undefined && csvVal !== '') {
        updateData[field] = csvVal;
      }
    }

    if (Object.keys(updateData).length === 0) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from(tableName as any) as any).update(updateData).eq(idField, dup.id);
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    const { error } = await query;
    if (!error) merged++;
  }
  return merged;
}

export function useImportTransactions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 0 });

  // ─── Scan duplicates (pre-import) ───

  const scanHotmartDuplicates = async (
    transactions: HotmartTransaction[],
    userId: string,
    clientId: string | null
  ): Promise<DuplicateScanResult> => {
    const existing = await fetchExistingHotmartRecords(userId, clientId);
    const newTx: HotmartTransaction[] = [];
    const duplicateMatches: DuplicateMatch[] = [];

    for (const t of transactions) {
      const ex = existing.get(t.transaction_code);
      if (ex) {
        duplicateMatches.push({
          id: t.transaction_code,
          csvData: t as unknown as Record<string, unknown>,
          existingData: ex,
          emptyFieldsInExisting: getEmptyFields(ex, MERGEABLE_HOTMART_FIELDS),
        });
      } else {
        newTx.push(t);
      }
    }
    return { newTransactions: newTx, duplicateMatches };
  };

  const scanTmbDuplicates = async (
    transactions: TmbTransaction[],
    userId: string,
    clientId: string | null
  ): Promise<DuplicateScanResult> => {
    const existing = await fetchExistingTmbRecords(userId, clientId);
    const newTx: TmbTransaction[] = [];
    const duplicateMatches: DuplicateMatch[] = [];

    for (const t of transactions) {
      const ex = existing.get(t.order_id);
      if (ex) {
        duplicateMatches.push({
          id: t.order_id,
          csvData: t as unknown as Record<string, unknown>,
          existingData: ex,
          emptyFieldsInExisting: getEmptyFields(ex, MERGEABLE_TMB_FIELDS),
        });
      } else {
        newTx.push(t);
      }
    }
    return { newTransactions: newTx, duplicateMatches };
  };

  const scanEduzzDuplicates = async (
    transactions: EduzzTransaction[],
    userId: string,
    clientId: string | null
  ): Promise<DuplicateScanResult> => {
    const existing = await fetchExistingEduzzRecords(userId, clientId);
    const newTx: EduzzTransaction[] = [];
    const duplicateMatches: DuplicateMatch[] = [];

    for (const t of transactions) {
      const ex = existing.get(t.sale_id);
      if (ex) {
        duplicateMatches.push({
          id: t.sale_id,
          csvData: t as unknown as Record<string, unknown>,
          existingData: ex,
          emptyFieldsInExisting: getEmptyFields(ex, MERGEABLE_EDUZZ_FIELDS),
        });
      } else {
        newTx.push(t);
      }
    }
    return { newTransactions: newTx, duplicateMatches };
  };

  // ─── Import functions (now accept pre-filtered transactions) ───

  const importHotmart = async (
    transactions: HotmartTransaction[],
    userId: string,
    importId: string,
    clientId: string | null,
    duplicateMatches?: DuplicateMatch[],
    mergeAction?: 'skip' | 'merge'
  ): Promise<ImportResult> => {
    setProgress({ current: 0, total: transactions.length });
    let importedCount = 0;
    let errorCount = 0;
    let mergedCount = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
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
      setProgress({ current: Math.min(i + BATCH_SIZE, transactions.length), total: transactions.length });
    }

    // Merge empty fields if requested
    if (mergeAction === 'merge' && duplicateMatches && duplicateMatches.length > 0) {
      mergedCount = await mergeRecords(
        'transactions', 'transaction_code', duplicateMatches, MERGEABLE_HOTMART_FIELDS, clientId
      );
    }

    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    return { importedCount, duplicateCount: duplicateMatches?.length ?? 0, errorCount, mergedCount };
  };

  const importTmb = async (
    transactions: TmbTransaction[],
    userId: string,
    importId: string,
    clientId: string | null,
    duplicateMatches?: DuplicateMatch[],
    mergeAction?: 'skip' | 'merge'
  ): Promise<ImportResult> => {
    setProgress({ current: 0, total: transactions.length });
    let importedCount = 0;
    let errorCount = 0;
    let mergedCount = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
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
      setProgress({ current: Math.min(i + BATCH_SIZE, transactions.length), total: transactions.length });
    }

    if (mergeAction === 'merge' && duplicateMatches && duplicateMatches.length > 0) {
      mergedCount = await mergeRecords(
        'tmb_transactions', 'order_id', duplicateMatches, MERGEABLE_TMB_FIELDS, clientId
      );
    }

    queryClient.invalidateQueries({ queryKey: ['tmb-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['tmb-transaction-stats'] });
    return { importedCount, duplicateCount: duplicateMatches?.length ?? 0, errorCount, mergedCount };
  };

  const importEduzz = async (
    transactions: EduzzTransaction[],
    userId: string,
    importId: string,
    clientId: string | null,
    duplicateMatches?: DuplicateMatch[],
    mergeAction?: 'skip' | 'merge'
  ): Promise<ImportResult> => {
    setProgress({ current: 0, total: transactions.length });
    let importedCount = 0;
    let errorCount = 0;
    let mergedCount = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
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
      setProgress({ current: Math.min(i + BATCH_SIZE, transactions.length), total: transactions.length });
    }

    if (mergeAction === 'merge' && duplicateMatches && duplicateMatches.length > 0) {
      mergedCount = await mergeRecords(
        'eduzz_transactions', 'sale_id', duplicateMatches, MERGEABLE_EDUZZ_FIELDS, clientId
      );
    }

    queryClient.invalidateQueries({ queryKey: ['eduzz-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['eduzz-transaction-stats'] });
    return { importedCount, duplicateCount: duplicateMatches?.length ?? 0, errorCount, mergedCount };
  };

  return {
    progress,
    importHotmart,
    importTmb,
    importEduzz,
    scanHotmartDuplicates,
    scanTmbDuplicates,
    scanEduzzDuplicates,
  };
}
