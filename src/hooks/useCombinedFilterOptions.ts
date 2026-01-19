import { useMemo } from 'react';
import { useFilterOptions, FilterOption } from './useFilterOptions';
import { useTmbFilterOptions, TmbFilterOption } from './useTmbFilterOptions';
import { useEduzzFilterOptions, EduzzFilterOption } from './useEduzzFilterOptions';

export interface CombinedFilterTotals {
  hotmart: number;
  tmb: number;
  eduzz: number;
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
  eduzz: {
    products: EduzzFilterOption[];
    utmSources: EduzzFilterOption[];
    utmMediums: EduzzFilterOption[];
    utmCampaigns: EduzzFilterOption[];
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
  const { data: eduzzData, isLoading: eduzzLoading } = useEduzzFilterOptions();

  const totals = useMemo(() => {
    // Para Hotmart, usamos sckCodes como referência (cada transação tem um sck_code)
    const hotmartTotal = hotmartData?.sckCodes 
      ? sumCounts(hotmartData.sckCodes) 
      : 0;
    
    // Para TMB, usamos products como referência
    const tmbTotal = tmbData?.products 
      ? sumCounts(tmbData.products) 
      : 0;

    // Para Eduzz, usamos products como referência
    const eduzzTotal = eduzzData?.products 
      ? sumCounts(eduzzData.products) 
      : 0;

    return {
      hotmart: hotmartTotal,
      tmb: tmbTotal,
      eduzz: eduzzTotal,
      combined: hotmartTotal + tmbTotal + eduzzTotal,
    };
  }, [hotmartData, tmbData, eduzzData]);

  const tmb = useMemo(() => {
    if (!tmbData) return null;
    return {
      products: tmbData.products || [],
      utmSources: tmbData.utm_sources || [],
      utmMediums: tmbData.utm_mediums || [],
      utmCampaigns: tmbData.utm_campaigns || [],
    };
  }, [tmbData]);

  const eduzz = useMemo(() => {
    if (!eduzzData) return null;
    return {
      products: eduzzData.products || [],
      utmSources: eduzzData.utm_sources || [],
      utmMediums: eduzzData.utm_mediums || [],
      utmCampaigns: eduzzData.utm_campaigns || [],
    };
  }, [eduzzData]);

  return {
    hotmart: hotmartData || null,
    tmb,
    eduzz,
    totals,
    isLoading: hotmartLoading || tmbLoading || eduzzLoading,
  };
}
