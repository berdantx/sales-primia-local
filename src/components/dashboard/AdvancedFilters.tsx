import { useState } from 'react';
import { Filter, X, ShoppingCart, Package, ChevronDown, ChevronUp, FileSpreadsheet, Webhook } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface AdvancedFiltersProps {
  billingType: string | null;
  paymentMethod: string | null;
  sckCode: string | null;
  product: string | null;
  source?: string | null;
  onBillingTypeChange: (value: string | null) => void;
  onPaymentMethodChange: (value: string | null) => void;
  onSckCodeChange: (value: string | null) => void;
  onProductChange: (value: string | null) => void;
  onSourceChange?: (value: string | null) => void;
  totalFilteredTransactions?: number;
}

export function AdvancedFilters({
  billingType,
  paymentMethod,
  sckCode,
  product,
  source,
  onBillingTypeChange,
  onPaymentMethodChange,
  onSckCodeChange,
  onProductChange,
  onSourceChange,
  totalFilteredTransactions,
}: AdvancedFiltersProps) {
  const { data: filterOptions, isLoading } = useFilterOptions();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = billingType || paymentMethod || sckCode || product || source;

  const clearAllFilters = () => {
    onBillingTypeChange(null);
    onPaymentMethodChange(null);
    onSckCodeChange(null);
    onProductChange(null);
    onSourceChange?.(null);
  };

  const activeFiltersCount = [billingType, paymentMethod, sckCode, product, source].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between sm:hidden">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Desktop always visible, mobile collapsible */}
      <div className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2 flex-wrap",
        !isExpanded && "hidden sm:flex"
      )}>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtros:</span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          <Select
            value={billingType || 'all'}
            onValueChange={(value) => onBillingTypeChange(value === 'all' ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full sm:w-[150px] h-8 sm:h-9 text-xs sm:text-sm bg-background">
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
            <SelectTrigger className="w-full sm:w-[150px] h-8 sm:h-9 text-xs sm:text-sm bg-background">
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
            <SelectTrigger className="w-full sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm bg-background">
              <SelectValue placeholder="Origem (SCK)" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50 max-h-[300px]">
              <SelectItem value="all">Todas origens</SelectItem>
              {filterOptions?.sckCodes.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs" title={option.value}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate" title={option.value}>{option.value.length > 20 ? `${option.value.slice(0, 20)}...` : option.value}</span>
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
            <SelectTrigger className="w-full sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm bg-background">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-muted-foreground" />
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50 max-h-[300px]">
              <SelectItem value="all">Todos os produtos</SelectItem>
              {filterOptions?.products.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs" title={option.value}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate" title={option.value}>{option.value.length > 25 ? `${option.value.slice(0, 25)}...` : option.value}</span>
                    <span className="text-muted-foreground">({option.count})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onSourceChange && (
            <Select
              value={source || 'all'}
              onValueChange={(value) => onSourceChange(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-8 sm:h-9 text-xs sm:text-sm bg-background">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="webhook">
                  <span className="flex items-center gap-2">
                    <Webhook className="h-3 w-3 text-emerald-500" />
                    <span>Webhook</span>
                  </span>
                </SelectItem>
                <SelectItem value="csv">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-3 w-3 text-blue-500" />
                    <span>CSV</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 sm:h-9 text-xs sm:text-sm text-muted-foreground hover:text-foreground w-full sm:w-auto"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground hidden sm:inline">Filtros ativos:</span>
          {billingType && (
            <Badge variant="secondary" className="text-xs" title={billingType}>
              <span className="hidden sm:inline">Tipo:</span> {billingType.length > 15 ? `${billingType.slice(0, 15)}...` : billingType}
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
              <span className="hidden sm:inline">Pagamento:</span> {paymentMethod}
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
              <span className="hidden sm:inline">SCK:</span> {sckCode.length > 15 ? `${sckCode.slice(0, 15)}...` : sckCode}
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
              <span className="hidden sm:inline">Produto:</span> {product.length > 15 ? `${product.slice(0, 15)}...` : product}
              <button
                onClick={() => onProductChange(null)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {source && onSourceChange && (
            <Badge variant="secondary" className="text-xs">
              <span className="hidden sm:inline">Origem:</span> {source === 'webhook' ? 'Webhook' : 'CSV'}
              <button
                onClick={() => onSourceChange(null)}
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
        <div className="pt-2 sm:pt-3 mt-1 border-t flex items-center gap-2 text-xs sm:text-sm">
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Total filtrado:</span>
          <span className="font-semibold">
            {totalFilteredTransactions.toLocaleString('pt-BR')} transações
          </span>
        </div>
      )}
    </div>
  );
}
