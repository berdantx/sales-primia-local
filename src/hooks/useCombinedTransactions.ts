import { useMemo } from 'react';
import { useTransactions, Transaction } from './useTransactions';
import { useTmbTransactions, TmbTransaction } from './useTmbTransactions';
import { useEduzzTransactions, EduzzTransaction } from './useEduzzTransactions';
import { PlatformType } from './useCombinedStats';

export interface UnifiedTransaction {
  id: string;
  platform: 'hotmart' | 'tmb' | 'eduzz';
  product: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  value: number;
  currency: string;
  date: string | null;
  utm_campaign: string | null;
  sck_code: string | null; // Only for Hotmart
}

export interface CombinedTransactionFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
  platform?: PlatformType;
}

export function useCombinedTransactions(filters?: CombinedTransactionFilters) {
  const platform = filters?.platform || 'all';
  
  // Fetch Hotmart transactions
  const { data: hotmartData, isLoading: hotmartLoading } = useTransactions(
    platform === 'tmb' || platform === 'eduzz' ? undefined : {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      clientId: filters?.clientId,
    }
  );

  // Fetch TMB transactions
  const { data: tmbData, isLoading: tmbLoading } = useTmbTransactions(
    platform === 'hotmart' || platform === 'eduzz' ? undefined : {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      clientId: filters?.clientId,
    }
  );

  // Fetch Eduzz transactions
  const { data: eduzzData, isLoading: eduzzLoading } = useEduzzTransactions(
    platform === 'hotmart' || platform === 'tmb' ? undefined : {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      clientId: filters?.clientId,
    }
  );

  const isLoading = hotmartLoading || tmbLoading || eduzzLoading;

  // Unify transactions into a common format
  const transactions = useMemo(() => {
    const unified: UnifiedTransaction[] = [];

    // Add Hotmart transactions
    if (platform === 'all' || platform === 'hotmart') {
      (hotmartData || []).forEach((t: Transaction) => {
        unified.push({
          id: t.id,
          platform: 'hotmart',
          product: t.product,
          buyer_name: t.buyer_name,
          buyer_email: t.buyer_email,
          value: t.computed_value,
          currency: t.currency,
          date: t.purchase_date,
          utm_campaign: null, // Hotmart doesn't have UTM in current schema
          sck_code: t.sck_code,
        });
      });
    }

    // Add TMB transactions
    if (platform === 'all' || platform === 'tmb') {
      (tmbData || []).forEach((t: TmbTransaction) => {
        unified.push({
          id: t.id,
          platform: 'tmb',
          product: t.product,
          buyer_name: t.buyer_name,
          buyer_email: t.buyer_email,
          value: t.ticket_value,
          currency: t.currency || 'BRL',
          date: t.effective_date,
          utm_campaign: t.utm_campaign,
          sck_code: null,
        });
      });
    }

    // Add Eduzz transactions
    if (platform === 'all' || platform === 'eduzz') {
      (eduzzData || []).forEach((t: EduzzTransaction) => {
        unified.push({
          id: t.id,
          platform: 'eduzz',
          product: t.product,
          buyer_name: t.buyer_name,
          buyer_email: t.buyer_email,
          value: t.sale_value,
          currency: t.currency || 'BRL',
          date: t.sale_date,
          utm_campaign: t.utm_campaign,
          sck_code: null,
        });
      });
    }

    // Sort by date descending
    return unified.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [hotmartData, tmbData, eduzzData, platform]);

  // Calculate sales by day
  const salesByDay = useMemo(() => {
    const byDay: Record<string, { count: number; value: number }> = {};
    
    transactions.forEach((t) => {
      if (!t.date) return;
      const dateKey = t.date.split('T')[0];
      if (!byDay[dateKey]) {
        byDay[dateKey] = { count: 0, value: 0 };
      }
      byDay[dateKey].count += 1;
      byDay[dateKey].value += t.value;
    });

    return byDay;
  }, [transactions]);

  return {
    transactions,
    salesByDay,
    isLoading,
    hotmartCount: hotmartData?.length || 0,
    tmbCount: tmbData?.length || 0,
    eduzzCount: eduzzData?.length || 0,
  };
}
