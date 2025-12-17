// Global filter context for advanced filters in header
import { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  billingType: string | null;
  paymentMethod: string | null;
  sckCode: string | null;
  product: string | null;
  setBillingType: (value: string | null) => void;
  setPaymentMethod: (value: string | null) => void;
  setSckCode: (value: string | null) => void;
  setProduct: (value: string | null) => void;
  clearAllFilters: () => void;
  activeFiltersCount: number;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [billingType, setBillingType] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [sckCode, setSckCode] = useState<string | null>(null);
  const [product, setProduct] = useState<string | null>(null);

  const clearAllFilters = () => {
    setBillingType(null);
    setPaymentMethod(null);
    setSckCode(null);
    setProduct(null);
  };

  const activeFiltersCount = [billingType, paymentMethod, sckCode, product].filter(Boolean).length;

  return (
    <FilterContext.Provider
      value={{
        billingType,
        paymentMethod,
        sckCode,
        product,
        setBillingType,
        setPaymentMethod,
        setSckCode,
        setProduct,
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
