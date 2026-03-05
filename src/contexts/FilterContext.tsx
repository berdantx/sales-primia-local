// Global filter context for advanced filters in header
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';

export type PlatformType = 'all' | 'hotmart' | 'tmb' | 'eduzz' | 'cispay';

// localStorage persistence for client and platform selection
const CLIENT_ID_STORAGE_KEY = 'selected_client_id';
const PLATFORM_STORAGE_KEY = 'selected_platform';

function getStoredClientId(): string | null {
  try {
    return localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredClientId(clientId: string | null): void {
  try {
    if (clientId) {
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
    } else {
      localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

function getStoredPlatform(): PlatformType {
  try {
    const stored = localStorage.getItem(PLATFORM_STORAGE_KEY);
    if (stored === 'hotmart' || stored === 'tmb' || stored === 'eduzz' || stored === 'all') {
      return stored;
    }
    return 'all';
  } catch {
    return 'all';
  }
}

function setStoredPlatform(platform: PlatformType): void {
  try {
    localStorage.setItem(PLATFORM_STORAGE_KEY, platform);
  } catch {
    // Ignore localStorage errors
  }
}

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
  
  // Common filters - initialize from localStorage
  const [clientIdState, setClientIdState] = useState<string | null>(getStoredClientId);
  const [platformState, setPlatformState] = useState<PlatformType>(getStoredPlatform);
  
  const { data: clients } = useClients();
  const { isMaster } = useUserRole();

  // Wrapper that persists clientId to localStorage
  const setClientId = (value: string | null) => {
    setClientIdState(value);
    setStoredClientId(value);
  };

  // Wrapper that persists platform to localStorage
  const setPlatform = (value: PlatformType) => {
    setPlatformState(value);
    setStoredPlatform(value);
  };

  // Validate and restore clientId when clients load
  useEffect(() => {
    if (clients && clients.length > 0) {
      const storedId = getStoredClientId();
      
      // Check if stored clientId is still valid (exists in user's client list)
      const isValidStoredClient = storedId && clients.some(c => c.id === storedId);
      
      if (isValidStoredClient && !clientIdState) {
        // Restore saved client
        setClientIdState(storedId);
      } else if (!isMaster && !clientIdState && !isValidStoredClient) {
        // Non-master without valid client: select first available
        setClientId(clients[0].id);
      } else if (!isMaster && clientIdState && !clients.some(c => c.id === clientIdState)) {
        // Non-master with invalid stored client: fallback to first
        setClientId(clients[0].id);
      }
    }
  }, [isMaster, clients, clientIdState]);

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
  const isReady = isMaster || clientIdState !== null;

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
        clientId: clientIdState,
        platform: platformState,
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
