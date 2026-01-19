// Global filter context for advanced filters in header
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';

export type PlatformType = 'all' | 'hotmart' | 'tmb' | 'eduzz';

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
  // Eduzz filters
  eduzzProduct: string | null;
  eduzzUtmSource: string | null;
  eduzzUtmMedium: string | null;
  eduzzUtmCampaign: string | null;
  // Common filters
  clientId: string | null;
  platform: PlatformType;
  isReady: boolean; // Indicates if client context is ready for data fetching
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
  // Eduzz setters
  setEduzzProduct: (value: string | null) => void;
  setEduzzUtmSource: (value: string | null) => void;
  setEduzzUtmMedium: (value: string | null) => void;
  setEduzzUtmCampaign: (value: string | null) => void;
  // Common setters
  setClientId: (value: string | null) => void;
  setPlatform: (value: PlatformType) => void;
  clearAllFilters: () => void;
  clearHotmartFilters: () => void;
  clearTmbFilters: () => void;
  clearEduzzFilters: () => void;
  activeFiltersCount: number;
  hotmartFiltersCount: number;
  tmbFiltersCount: number;
  eduzzFiltersCount: number;
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
  
  // Eduzz filters
  const [eduzzProduct, setEduzzProduct] = useState<string | null>(null);
  const [eduzzUtmSource, setEduzzUtmSource] = useState<string | null>(null);
  const [eduzzUtmMedium, setEduzzUtmMedium] = useState<string | null>(null);
  const [eduzzUtmCampaign, setEduzzUtmCampaign] = useState<string | null>(null);
  
  // Common filters
  const [clientId, setClientId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<PlatformType>('all');
  
  const { data: clients } = useClients();
  const { isMaster } = useUserRole();

  // Auto-set clientId for non-master users
  // If they have one or more clients and no clientId is set, select the first one
  useEffect(() => {
    if (!isMaster && clients && clients.length > 0 && !clientId) {
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

  const clearEduzzFilters = () => {
    setEduzzProduct(null);
    setEduzzUtmSource(null);
    setEduzzUtmMedium(null);
    setEduzzUtmCampaign(null);
  };

  const clearAllFilters = () => {
    clearHotmartFilters();
    clearTmbFilters();
    clearEduzzFilters();
    setPlatform('all');
    // Don't clear clientId for non-master users
    if (isMaster) {
      setClientId(null);
    }
  };

  const hotmartFiltersCount = [billingType, paymentMethod, sckCode, product].filter(Boolean).length;
  const tmbFiltersCount = [tmbProduct, utmSource, utmMedium, utmCampaign].filter(Boolean).length;
  const eduzzFiltersCount = [eduzzProduct, eduzzUtmSource, eduzzUtmMedium, eduzzUtmCampaign].filter(Boolean).length;
  const activeFiltersCount = hotmartFiltersCount + tmbFiltersCount + eduzzFiltersCount;
  
  // isReady indicates when client context is properly set for data fetching
  // For master users: always ready (they can see all data)
  // For non-master users: ready when clientId is set (they need a client context)
  const isReady = isMaster || clientId !== null;

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
        // Eduzz filters
        eduzzProduct,
        eduzzUtmSource,
        eduzzUtmMedium,
        eduzzUtmCampaign,
        // Common filters
        clientId,
        platform,
        isReady,
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
        // Eduzz setters
        setEduzzProduct,
        setEduzzUtmSource,
        setEduzzUtmMedium,
        setEduzzUtmCampaign,
        // Common setters
        setClientId,
        setPlatform,
        clearAllFilters,
        clearHotmartFilters,
        clearTmbFilters,
        clearEduzzFilters,
        activeFiltersCount,
        hotmartFiltersCount,
        tmbFiltersCount,
        eduzzFiltersCount,
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
