// Global filter context for advanced filters in header
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';

export type PlatformType = 'all' | 'hotmart' | 'tmb';

interface FilterContextType {
  // Hotmart filters
  billingType: string | null;
  paymentMethod: string | null;
  sckCode: string | null;
  product: string | null;
  // TMB filters
  tmbProduct: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  // Common filters
  clientId: string | null;
  platform: PlatformType;
  // Hotmart setters
  setBillingType: (value: string | null) => void;
  setPaymentMethod: (value: string | null) => void;
  setSckCode: (value: string | null) => void;
  setProduct: (value: string | null) => void;
  // TMB setters
  setTmbProduct: (value: string | null) => void;
  setUtmSource: (value: string | null) => void;
  setUtmMedium: (value: string | null) => void;
  setUtmCampaign: (value: string | null) => void;
  // Common setters
  setClientId: (value: string | null) => void;
  setPlatform: (value: PlatformType) => void;
  clearAllFilters: () => void;
  clearHotmartFilters: () => void;
  clearTmbFilters: () => void;
  activeFiltersCount: number;
  hotmartFiltersCount: number;
  tmbFiltersCount: number;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  // Hotmart filters
  const [billingType, setBillingType] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [sckCode, setSckCode] = useState<string | null>(null);
  const [product, setProduct] = useState<string | null>(null);
  
  // TMB filters
  const [tmbProduct, setTmbProduct] = useState<string | null>(null);
  const [utmSource, setUtmSource] = useState<string | null>(null);
  const [utmMedium, setUtmMedium] = useState<string | null>(null);
  const [utmCampaign, setUtmCampaign] = useState<string | null>(null);
  
  // Common filters
  const [clientId, setClientId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<PlatformType>('all');
  
  const { data: clients } = useClients();
  const { isMaster } = useUserRole();

  // Auto-set clientId for non-master users (they only have access to one client)
  useEffect(() => {
    if (!isMaster && clients && clients.length === 1 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [isMaster, clients, clientId]);

  const clearHotmartFilters = () => {
    setBillingType(null);
    setPaymentMethod(null);
    setSckCode(null);
    setProduct(null);
  };

  const clearTmbFilters = () => {
    setTmbProduct(null);
    setUtmSource(null);
    setUtmMedium(null);
    setUtmCampaign(null);
  };

  const clearAllFilters = () => {
    clearHotmartFilters();
    clearTmbFilters();
    setPlatform('all');
    // Don't clear clientId for non-master users
    if (isMaster) {
      setClientId(null);
    }
  };

  const hotmartFiltersCount = [billingType, paymentMethod, sckCode, product].filter(Boolean).length;
  const tmbFiltersCount = [tmbProduct, utmSource, utmMedium, utmCampaign].filter(Boolean).length;
  const activeFiltersCount = hotmartFiltersCount + tmbFiltersCount;

  return (
    <FilterContext.Provider
      value={{
        // Hotmart filters
        billingType,
        paymentMethod,
        sckCode,
        product,
        // TMB filters
        tmbProduct,
        utmSource,
        utmMedium,
        utmCampaign,
        // Common filters
        clientId,
        platform,
        // Hotmart setters
        setBillingType,
        setPaymentMethod,
        setSckCode,
        setProduct,
        // TMB setters
        setTmbProduct,
        setUtmSource,
        setUtmMedium,
        setUtmCampaign,
        // Common setters
        setClientId,
        setPlatform,
        clearAllFilters,
        clearHotmartFilters,
        clearTmbFilters,
        activeFiltersCount,
        hotmartFiltersCount,
        tmbFiltersCount,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
