import { useMemo } from 'react';
import { 
  useTransactionStatsOptimized, 
  useTopCustomersOptimized, 
  useSalesByDateOptimized 
} from '@/hooks/useTransactionStatsOptimized';
import { 
  useTmbTransactionStatsOptimized, 
  useTmbTopCustomersOptimized, 
  useTmbSalesByDateOptimized 
} from '@/hooks/useTmbTransactionStatsOptimized';

export type PlatformType = 'all' | 'hotmart' | 'tmb';

export interface CombinedFilters {
  startDate?: Date;
  endDate?: Date;
  billingType?: string | null;
  paymentMethod?: string | null;
  sckCode?: string | null;
  product?: string | null;
  clientId?: string | null;
}

export function useCombinedStats(filters: CombinedFilters, platform: PlatformType) {
  // Hotmart stats
  const { data: hotmartStats, isLoading: hotmartLoading } = useTransactionStatsOptimized(
    platform !== 'tmb' ? filters : { startDate: undefined, endDate: undefined }
  );
  const { data: hotmartTopCustomers, isLoading: hotmartCustomersLoading } = useTopCustomersOptimized(
    platform !== 'tmb' ? filters : { startDate: undefined, endDate: undefined }
  );
  const { data: hotmartSalesByDate, isLoading: hotmartSalesLoading } = useSalesByDateOptimized(
    platform !== 'tmb' ? filters : { startDate: undefined, endDate: undefined }
  );

  // TMB stats (simplified filters, no advanced filters for TMB)
  const tmbFilters = { startDate: filters.startDate, endDate: filters.endDate, clientId: filters.clientId };
  const { data: tmbStats, isLoading: tmbLoading } = useTmbTransactionStatsOptimized(
    platform !== 'hotmart' ? tmbFilters : { startDate: undefined, endDate: undefined }
  );
  const { data: tmbTopCustomers, isLoading: tmbCustomersLoading } = useTmbTopCustomersOptimized(
    platform !== 'hotmart' ? tmbFilters : { startDate: undefined, endDate: undefined }
  );
  const { data: tmbSalesByDate, isLoading: tmbSalesLoading } = useTmbSalesByDateOptimized(
    platform !== 'hotmart' ? tmbFilters : { startDate: undefined, endDate: undefined }
  );

  const isLoading = hotmartLoading || hotmartCustomersLoading || hotmartSalesLoading ||
                    tmbLoading || tmbCustomersLoading || tmbSalesLoading;

  // Combined stats based on platform
  const stats = useMemo(() => {
    if (platform === 'hotmart') {
      return hotmartStats;
    }
    
    if (platform === 'tmb') {
      return {
        totalByCurrency: { BRL: tmbStats?.totalBRL || 0 },
        totalByCountry: {},
        totalByCountryCurrency: {},
        totalTransactions: tmbStats?.totalTransactions || 0,
        transactionsWithoutDate: tmbStats?.transactionsWithoutDate || 0,
      };
    }

    // Combined 'all'
    const hotmartBRL = hotmartStats?.totalByCurrency?.['BRL'] || 0;
    const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
    const tmbBRL = tmbStats?.totalBRL || 0;

    return {
      totalByCurrency: {
        BRL: hotmartBRL + tmbBRL,
        ...(hotmartUSD > 0 ? { USD: hotmartUSD } : {}),
      },
      totalByCountry: hotmartStats?.totalByCountry || {},
      totalByCountryCurrency: hotmartStats?.totalByCountryCurrency || {},
      totalTransactions: (hotmartStats?.totalTransactions || 0) + (tmbStats?.totalTransactions || 0),
      transactionsWithoutDate: (hotmartStats?.transactionsWithoutDate || 0) + (tmbStats?.transactionsWithoutDate || 0),
    };
  }, [platform, hotmartStats, tmbStats]);

  // Combined top customers
  const topCustomers = useMemo(() => {
    if (platform === 'hotmart') return hotmartTopCustomers || [];
    if (platform === 'tmb') return tmbTopCustomers || [];

    // Merge and sort by totalValue
    const allCustomers = [
      ...(hotmartTopCustomers || []),
      ...(tmbTopCustomers || []),
    ];

    // Group by email and sum values
    const customerMap = new Map<string, typeof allCustomers[0]>();
    allCustomers.forEach(c => {
      const existing = customerMap.get(c.email);
      if (existing) {
        customerMap.set(c.email, {
          ...existing,
          totalValue: existing.totalValue + c.totalValue,
          totalPurchases: existing.totalPurchases + c.totalPurchases,
        });
      } else {
        customerMap.set(c.email, { ...c });
      }
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  }, [platform, hotmartTopCustomers, tmbTopCustomers]);

  // Combined sales by date
  const salesByDate = useMemo(() => {
    if (platform === 'hotmart') return hotmartSalesByDate || {};
    if (platform === 'tmb') return tmbSalesByDate || {};

    // Merge dates
    const combined: Record<string, Record<string, number>> = {};
    
    // Add hotmart data
    Object.entries(hotmartSalesByDate || {}).forEach(([date, currencies]) => {
      combined[date] = { ...currencies };
    });

    // Add TMB data (BRL only)
    Object.entries(tmbSalesByDate || {}).forEach(([date, currencies]) => {
      if (!combined[date]) {
        combined[date] = {};
      }
      combined[date].BRL = (combined[date].BRL || 0) + (currencies.BRL || 0);
    });

    return combined;
  }, [platform, hotmartSalesByDate, tmbSalesByDate]);

  const currencies = useMemo(() => {
    if (!stats?.totalByCurrency) return [];
    return Object.keys(stats.totalByCurrency);
  }, [stats]);

  return {
    stats,
    topCustomers,
    salesByDate,
    currencies,
    isLoading,
    // Individual platform data for comparison
    hotmartStats,
    tmbStats,
  };
}
