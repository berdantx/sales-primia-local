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
import { 
  useEduzzTransactionStatsOptimized, 
  useEduzzTopCustomersOptimized, 
  useEduzzSalesByDateOptimized 
} from '@/hooks/useEduzzTransactionStatsOptimized';
import { 
  useCispayTransactionStatsOptimized, 
  useCispayTopCustomersOptimized, 
  useCispaySalesByDateOptimized 
} from '@/hooks/useCispayTransactionStatsOptimized';

export type PlatformType = 'all' | 'hotmart' | 'tmb' | 'eduzz' | 'cispay';

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
  // Always fetch Hotmart stats for combined calculations
  const { data: hotmartStats, isLoading: hotmartLoading } = useTransactionStatsOptimized(filters);
  const { data: hotmartTopCustomers, isLoading: hotmartCustomersLoading } = useTopCustomersOptimized(
    platform !== 'tmb' && platform !== 'eduzz' ? filters : { startDate: undefined, endDate: undefined }
  );
  const { data: hotmartSalesByDate, isLoading: hotmartSalesLoading } = useSalesByDateOptimized(
    platform !== 'tmb' && platform !== 'eduzz' ? filters : { startDate: undefined, endDate: undefined }
  );

  // TMB stats (simplified filters, no advanced filters for TMB)
  const tmbFilters = { startDate: filters.startDate, endDate: filters.endDate, clientId: filters.clientId };
  // Always fetch TMB stats for combined calculations
  const { data: tmbStats, isLoading: tmbLoading } = useTmbTransactionStatsOptimized(tmbFilters);
  const { data: tmbTopCustomers, isLoading: tmbCustomersLoading } = useTmbTopCustomersOptimized(
    platform !== 'hotmart' && platform !== 'eduzz' ? tmbFilters : { startDate: undefined, endDate: undefined }
  );
  const { data: tmbSalesByDate, isLoading: tmbSalesLoading } = useTmbSalesByDateOptimized(
    platform !== 'hotmart' && platform !== 'eduzz' ? tmbFilters : { startDate: undefined, endDate: undefined }
  );

  // Eduzz stats (simplified filters, like TMB)
  const eduzzFilters = { startDate: filters.startDate, endDate: filters.endDate, clientId: filters.clientId };
  // Always fetch Eduzz stats for combined calculations
  const { data: eduzzStats, isLoading: eduzzLoading } = useEduzzTransactionStatsOptimized(eduzzFilters);
  const { data: eduzzTopCustomers, isLoading: eduzzCustomersLoading } = useEduzzTopCustomersOptimized(
    platform !== 'hotmart' && platform !== 'tmb' ? eduzzFilters : { startDate: undefined, endDate: undefined }
  );
  const { data: eduzzSalesByDate, isLoading: eduzzSalesLoading } = useEduzzSalesByDateOptimized(
    platform !== 'hotmart' && platform !== 'tmb' ? eduzzFilters : { startDate: undefined, endDate: undefined }
  );

  // CIS PAY stats
  const cispayFilters = { startDate: filters.startDate, endDate: filters.endDate, clientId: filters.clientId };
  const { data: cispayStats, isLoading: cispayLoading } = useCispayTransactionStatsOptimized(cispayFilters);
  const { data: cispayTopCustomers, isLoading: cispayCustomersLoading } = useCispayTopCustomersOptimized(
    platform === 'all' || platform === 'cispay' ? cispayFilters : { startDate: undefined, endDate: undefined }
  );
  const { data: cispaySalesByDate, isLoading: cispaySalesLoading } = useCispaySalesByDateOptimized(
    platform === 'all' || platform === 'cispay' ? cispayFilters : { startDate: undefined, endDate: undefined }
  );

  const isLoading = hotmartLoading || hotmartCustomersLoading || hotmartSalesLoading ||
                    tmbLoading || tmbCustomersLoading || tmbSalesLoading ||
                    eduzzLoading || eduzzCustomersLoading || eduzzSalesLoading ||
                    cispayLoading || cispayCustomersLoading || cispaySalesLoading;

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

    if (platform === 'eduzz') {
      return {
        totalByCurrency: { 
          BRL: eduzzStats?.totalBRL || 0,
          ...(eduzzStats?.totalUSD ? { USD: eduzzStats.totalUSD } : {}),
        },
        totalByCountry: {},
        totalByCountryCurrency: {},
        totalTransactions: eduzzStats?.totalTransactions || 0,
        transactionsWithoutDate: eduzzStats?.transactionsWithoutDate || 0,
      };
    }

    if (platform === 'cispay') {
      return {
        totalByCurrency: { BRL: cispayStats?.totalBRL || 0 },
        totalByCountry: {},
        totalByCountryCurrency: {},
        totalTransactions: cispayStats?.totalTransactions || 0,
        transactionsWithoutDate: cispayStats?.transactionsWithoutDate || 0,
      };
    }

    // Combined 'all'
    const hotmartBRL = hotmartStats?.totalByCurrency?.['BRL'] || 0;
    const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
    const tmbBRL = tmbStats?.totalBRL || 0;
    const eduzzBRL = eduzzStats?.totalBRL || 0;
    const eduzzUSD = eduzzStats?.totalUSD || 0;
    const cispayBRL = cispayStats?.totalBRL || 0;

    const combinedUSD = hotmartUSD + eduzzUSD;

    return {
      totalByCurrency: {
        BRL: hotmartBRL + tmbBRL + eduzzBRL + cispayBRL,
        ...(combinedUSD > 0 ? { USD: combinedUSD } : {}),
      },
      totalByCountry: hotmartStats?.totalByCountry || {},
      totalByCountryCurrency: hotmartStats?.totalByCountryCurrency || {},
      totalTransactions: (hotmartStats?.totalTransactions || 0) + (tmbStats?.totalTransactions || 0) + (eduzzStats?.totalTransactions || 0) + (cispayStats?.totalTransactions || 0),
      transactionsWithoutDate: (hotmartStats?.transactionsWithoutDate || 0) + (tmbStats?.transactionsWithoutDate || 0) + (eduzzStats?.transactionsWithoutDate || 0) + (cispayStats?.transactionsWithoutDate || 0),
    };
  }, [platform, hotmartStats, tmbStats, eduzzStats, cispayStats]);

  // Combined top customers
  const topCustomers = useMemo(() => {
    if (platform === 'hotmart') return hotmartTopCustomers || [];
    if (platform === 'tmb') return tmbTopCustomers || [];
    if (platform === 'eduzz') return eduzzTopCustomers || [];
    if (platform === 'cispay') return cispayTopCustomers || [];

    // Merge and sort by totalValue
    const allCustomers = [
      ...(hotmartTopCustomers || []),
      ...(tmbTopCustomers || []),
      ...(eduzzTopCustomers || []),
      ...(cispayTopCustomers || []),
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
  }, [platform, hotmartTopCustomers, tmbTopCustomers, eduzzTopCustomers, cispayTopCustomers]);

  // Combined sales by date
  const salesByDate = useMemo(() => {
    if (platform === 'hotmart') return hotmartSalesByDate || {};
    if (platform === 'tmb') return tmbSalesByDate || {};
    if (platform === 'eduzz') return eduzzSalesByDate || {};
    if (platform === 'cispay') return cispaySalesByDate || {};

    // Merge dates
    const combined: Record<string, Record<string, number>> = {};
    
    // Add hotmart data
    Object.entries(hotmartSalesByDate || {}).forEach(([date, currencies]) => {
      combined[date] = { ...currencies };
    });

    // Add TMB data (BRL only)
    Object.entries(tmbSalesByDate || {}).forEach(([date, currencies]) => {
      if (!combined[date]) combined[date] = {};
      combined[date].BRL = (combined[date].BRL || 0) + (currencies.BRL || 0);
    });

    // Add Eduzz data (BRL and USD)
    Object.entries(eduzzSalesByDate || {}).forEach(([date, currencies]) => {
      if (!combined[date]) combined[date] = {};
      combined[date].BRL = (combined[date].BRL || 0) + (currencies.BRL || 0);
      if (currencies.USD) {
        combined[date].USD = (combined[date].USD || 0) + currencies.USD;
      }
    });

    // Add CIS PAY data (BRL only)
    Object.entries(cispaySalesByDate || {}).forEach(([date, currencies]) => {
      if (!combined[date]) combined[date] = {};
      combined[date].BRL = (combined[date].BRL || 0) + (currencies.BRL || 0);
    });

    return combined;
  }, [platform, hotmartSalesByDate, tmbSalesByDate, eduzzSalesByDate, cispaySalesByDate]);

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
    eduzzStats,
    cispayStats,
  };
}
