import { useState } from 'react';
import { Filter, X, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useFilter } from '@/contexts/FilterContext';

export function HeaderFilters() {
  const [open, setOpen] = useState(false);
  const { data: filterOptions, isLoading } = useFilterOptions();
  const {
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
  } = useFilter();

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <>
      {/* Desktop: inline filters */}
      <div className="hidden lg:flex items-center gap-1.5">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        <Select
          value={billingType || 'all'}
          onValueChange={(value) => setBillingType(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos tipos</SelectItem>
            {filterOptions?.billingTypes.map((option) => (
              <SelectItem key={option.value} value={option.value} title={option.value}>
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[100px]">{option.value}</span>
                  <span className="text-muted-foreground text-xs">({option.count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentMethod || 'all'}
          onValueChange={(value) => setPaymentMethod(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos</SelectItem>
            {filterOptions?.paymentMethods.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <span>{option.value}</span>
                  <span className="text-muted-foreground text-xs">({option.count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sckCode || 'all'}
          onValueChange={(value) => setSckCode(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-[300px]">
            <SelectItem value="all">Todas origens</SelectItem>
            {filterOptions?.sckCodes.map((option) => (
              <SelectItem key={option.value} value={option.value} title={option.value}>
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[80px]">{option.value}</span>
                  <span className="text-muted-foreground text-xs">({option.count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={product || 'all'}
          onValueChange={(value) => setProduct(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
            <Package className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-[300px]">
            <SelectItem value="all">Todos produtos</SelectItem>
            {filterOptions?.products.map((option) => (
              <SelectItem key={option.value} value={option.value} title={option.value}>
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[80px]">{option.value}</span>
                  <span className="text-muted-foreground text-xs">({option.count})</span>
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
            className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Mobile/Tablet: popover with filters */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden h-8 px-2 sm:px-3 relative"
          >
            <Filter className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Filtros</span>
            {hasActiveFilters && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
              >
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 ml-1 hidden sm:block" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filtros Avançados</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Select
                value={billingType || 'all'}
                onValueChange={(value) => setBillingType(value === 'all' ? null : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-9 text-sm bg-background">
                  <SelectValue placeholder="Tipo de Cobrança" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {filterOptions?.billingTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={paymentMethod || 'all'}
                onValueChange={(value) => setPaymentMethod(value === 'all' ? null : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-9 text-sm bg-background">
                  <SelectValue placeholder="Método de Pagamento" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos os pagamentos</SelectItem>
                  {filterOptions?.paymentMethods.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sckCode || 'all'}
                onValueChange={(value) => setSckCode(value === 'all' ? null : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-9 text-sm bg-background">
                  <SelectValue placeholder="Origem (SCK)" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-[200px]">
                  <SelectItem value="all">Todas as origens</SelectItem>
                  {filterOptions?.sckCodes.map((option) => (
                    <SelectItem key={option.value} value={option.value} title={option.value}>
                      {option.value.length > 25 ? `${option.value.slice(0, 25)}...` : option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={product || 'all'}
                onValueChange={(value) => setProduct(value === 'all' ? null : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-9 text-sm bg-background">
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-[200px]">
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {filterOptions?.products.map((option) => (
                    <SelectItem key={option.value} value={option.value} title={option.value}>
                      {option.value.length > 25 ? `${option.value.slice(0, 25)}...` : option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
