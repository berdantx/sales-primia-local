import { useMemo } from 'react';
import { useFilterOptions, FilterOption } from './useFilterOptions';
import { useTmbFilterOptions, TmbFilterOption } from './useTmbFilterOptions';

export interface CombinedFilterTotals {
  hotmart: number;
  tmb: number;
  combined: number;
}

export interface CombinedFilterOptions {
  hotmart: {
    billingTypes: FilterOption[];
    paymentMethods: FilterOption[];
    sckCodes: FilterOption[];
    products: FilterOption[];
  } | null;
  tmb: {
    products: TmbFilterOption[];
    utmSources: TmbFilterOption[];
    utmMediums: TmbFilterOption[];
    utmCampaigns: TmbFilterOption[];
  } | null;
  totals: CombinedFilterTotals;
  isLoading: boolean;
}

function sumCounts(options: { count: number }[]): number {
  return options.reduce((acc, opt) => acc + opt.count, 0);
}

export function useCombinedFilterOptions(): CombinedFilterOptions {
  const { data: hotmartData, isLoading: hotmartLoading } = useFilterOptions();
  const { data: tmbData, isLoading: tmbLoading } = useTmbFilterOptions();

  const totals = useMemo(() => {
    // Para Hotmart, usamos sckCodes como referência (cada transação tem um sck_code)
    const hotmartTotal = hotmartData?.sckCodes 
      ? sumCounts(hotmartData.sckCodes) 
      : 0;
    
    // Para TMB, usamos products como referência
    const tmbTotal = tmbData?.products 
      ? sumCounts(tmbData.products) 
      : 0;

    return {
      hotmart: hotmartTotal,
      tmb: tmbTotal,
      combined: hotmartTotal + tmbTotal,
    };
  }, [hotmartData, tmbData]);

  const tmb = useMemo(() => {
    if (!tmbData) return null;
    return {
      products: tmbData.products || [],
      utmSources: tmbData.utm_sources || [],
      utmMediums: tmbData.utm_mediums || [],
      utmCampaigns: tmbData.utm_campaigns || [],
    };
  }, [tmbData]);

  return {
    hotmart: hotmartData || null,
    tmb,
    totals,
    isLoading: hotmartLoading || tmbLoading,
  };
}
