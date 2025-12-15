import { Filter, X, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFilterOptions } from '@/hooks/useFilterOptions';

interface AdvancedFiltersProps {
  billingType: string | null;
  paymentMethod: string | null;
  sckCode: string | null;
  product: string | null;
  onBillingTypeChange: (value: string | null) => void;
  onPaymentMethodChange: (value: string | null) => void;
  onSckCodeChange: (value: string | null) => void;
  onProductChange: (value: string | null) => void;
  totalFilteredTransactions?: number;
}

export function AdvancedFilters({
  billingType,
  paymentMethod,
  sckCode,
  product,
  onBillingTypeChange,
  onPaymentMethodChange,
  onSckCodeChange,
  onProductChange,
  totalFilteredTransactions,
}: AdvancedFiltersProps) {
  const { data: filterOptions, isLoading } = useFilterOptions();

  const hasActiveFilters = billingType || paymentMethod || sckCode || product;

  const clearAllFilters = () => {
    onBillingTypeChange(null);
    onPaymentMethodChange(null);
    onSckCodeChange(null);
    onProductChange(null);
  };

  const activeFiltersCount = [billingType, paymentMethod, sckCode, product].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtros:</span>
        </div>

        <Select
          value={billingType || 'all'}
          onValueChange={(value) => onBillingTypeChange(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[180px] h-9 bg-background">
            <SelectValue placeholder="Tipo Cobrança" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos os tipos</SelectItem>
            {filterOptions?.billingTypes.map((option) => (
              <SelectItem key={option.value} value={option.value} title={option.value}>
                <span className="flex items-center justify-between w-full gap-2">
                  <span className="truncate" title={option.value}>{option.value}</span>
                  <span className="text-muted-foreground text-xs">({option.count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentMethod || 'all'}
          onValueChange={(value) => onPaymentMethodChange(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[180px] h-9 bg-background">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos pagamentos</SelectItem>
            {filterOptions?.paymentMethods.map((option) => (
              <SelectItem key={option.value} value={option.value} title={option.value}>
                <span className="flex items-center justify-between w-full gap-2">
                  <span className="truncate" title={option.value}>{option.value}</span>
                  <span className="text-muted-foreground text-xs">({option.count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sckCode || 'all'}
          onValueChange={(value) => onSckCodeChange(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px] h-9 bg-background">
            <SelectValue placeholder="Origem (SCK)" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-[300px]">
            <SelectItem value="all">Todas origens</SelectItem>
            {filterOptions?.sckCodes.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs" title={option.value}>
                <span className="flex items-center justify-between w-full gap-2">
                  <span className="truncate" title={option.value}>{option.value.length > 25 ? `${option.value.slice(0, 25)}...` : option.value}</span>
                  <span className="text-muted-foreground">({option.count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={product || 'all'}
          onValueChange={(value) => onProductChange(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px] h-9 bg-background">
            <Package className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-[300px]">
            <SelectItem value="all">Todos os produtos</SelectItem>
            {filterOptions?.products.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs" title={option.value}>
                <span className="flex items-center justify-between w-full gap-2">
                  <span className="truncate" title={option.value}>{option.value.length > 30 ? `${option.value.slice(0, 30)}...` : option.value}</span>
                  <span className="text-muted-foreground">({option.count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          {billingType && (
            <Badge variant="secondary" className="text-xs" title={billingType}>
              Tipo: {billingType}
              <button
                onClick={() => onBillingTypeChange(null)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {paymentMethod && (
            <Badge variant="secondary" className="text-xs" title={paymentMethod}>
              Pagamento: {paymentMethod}
              <button
                onClick={() => onPaymentMethodChange(null)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {sckCode && (
            <Badge variant="secondary" className="text-xs" title={sckCode}>
              SCK: {sckCode.length > 20 ? `${sckCode.slice(0, 20)}...` : sckCode}
              <button
                onClick={() => onSckCodeChange(null)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {product && (
            <Badge variant="secondary" className="text-xs" title={product}>
              Produto: {product.length > 20 ? `${product.slice(0, 20)}...` : product}
              <button
                onClick={() => onProductChange(null)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            ({activeFiltersCount} {activeFiltersCount === 1 ? 'filtro' : 'filtros'})
          </span>
        </div>
      )}

      {/* Footer with filtered transactions count */}
      {totalFilteredTransactions !== undefined && (
        <div className="pt-3 mt-1 border-t flex items-center gap-2 text-sm">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Total filtrado:</span>
          <span className="font-semibold">
            {totalFilteredTransactions.toLocaleString('pt-BR')} transações
          </span>
        </div>
      )}
    </div>
  );
}
