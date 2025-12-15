import { Filter, X } from 'lucide-react';
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
  onBillingTypeChange: (value: string | null) => void;
  onPaymentMethodChange: (value: string | null) => void;
  onSckCodeChange: (value: string | null) => void;
}

export function AdvancedFilters({
  billingType,
  paymentMethod,
  sckCode,
  onBillingTypeChange,
  onPaymentMethodChange,
  onSckCodeChange,
}: AdvancedFiltersProps) {
  const { data: filterOptions, isLoading } = useFilterOptions();

  const hasActiveFilters = billingType || paymentMethod || sckCode;

  const clearAllFilters = () => {
    onBillingTypeChange(null);
    onPaymentMethodChange(null);
    onSckCodeChange(null);
  };

  const activeFiltersCount = [billingType, paymentMethod, sckCode].filter(Boolean).length;

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
            {filterOptions?.billingTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
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
            {filterOptions?.paymentMethods.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
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
            {filterOptions?.sckCodes.map((code) => (
              <SelectItem key={code} value={code} className="text-xs">
                {code.length > 30 ? `${code.slice(0, 30)}...` : code}
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
            <Badge variant="secondary" className="text-xs">
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
            <Badge variant="secondary" className="text-xs">
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
            <Badge variant="secondary" className="text-xs">
              SCK: {sckCode.length > 20 ? `${sckCode.slice(0, 20)}...` : sckCode}
              <button
                onClick={() => onSckCodeChange(null)}
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
    </div>
  );
}
