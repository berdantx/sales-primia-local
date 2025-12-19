// Global filter context for advanced filters in header
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';

interface FilterContextType {
  billingType: string | null;
  paymentMethod: string | null;
  sckCode: string | null;
  product: string | null;
  clientId: string | null;
  setBillingType: (value: string | null) => void;
  setPaymentMethod: (value: string | null) => void;
  setSckCode: (value: string | null) => void;
  setProduct: (value: string | null) => void;
  setClientId: (value: string | null) => void;
  clearAllFilters: () => void;
  activeFiltersCount: number;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [billingType, setBillingType] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [sckCode, setSckCode] = useState<string | null>(null);
  const [product, setProduct] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  
  const { data: clients } = useClients();
  const { isMaster } = useUserRole();

  // Auto-set clientId for non-master users (they only have access to one client)
  useEffect(() => {
    if (!isMaster && clients && clients.length === 1 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [isMaster, clients, clientId]);

  const clearAllFilters = () => {
    setBillingType(null);
    setPaymentMethod(null);
    setSckCode(null);
    setProduct(null);
    // Don't clear clientId for non-master users
    if (isMaster) {
      setClientId(null);
    }
  };

  const activeFiltersCount = [billingType, paymentMethod, sckCode, product].filter(Boolean).length;

  return (
    <FilterContext.Provider
      value={{
        billingType,
        paymentMethod,
        sckCode,
        product,
        clientId,
        setBillingType,
        setPaymentMethod,
        setSckCode,
        setProduct,
        setClientId,
        clearAllFilters,
        activeFiltersCount,
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
