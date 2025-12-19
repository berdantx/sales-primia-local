import { useState, useMemo } from 'react';
import { Search, MapPin, CreditCard, Package, RefreshCw, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useFilterOptions, FilterOption } from '@/hooks/useFilterOptions';
import { useFilter } from '@/contexts/FilterContext';
import { cn } from '@/lib/utils';

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
  searchTerm: string;
  defaultOpen?: boolean;
}

function FilterSection({ 
  title, 
  icon, 
  options, 
  selectedValue, 
  onSelect, 
  searchTerm,
  defaultOpen = false 
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => 
      opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const sortedOptions = useMemo(() => {
    return [...filteredOptions].sort((a, b) => b.count - a.count);
  }, [filteredOptions]);

  const totalCount = options.reduce((acc, opt) => acc + opt.count, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b border-border/50">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 hover:bg-muted/50 rounded-md transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="secondary" className="text-xs h-5">
            {options.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {selectedValue && (
            <Badge variant="default" className="text-xs max-w-[150px] truncate">
              {selectedValue}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{totalCount} vendas</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">
        <div className="space-y-1 mt-2">
          {/* Option: All */}
          <button
            onClick={() => onSelect(null)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors text-left",
              !selectedValue 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "hover:bg-muted"
            )}
          >
            <span className="font-medium">Todos</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{totalCount}</span>
              {!selectedValue && <Check className="h-4 w-4 text-primary" />}
            </div>
          </button>

          {/* Individual options */}
          {sortedOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum resultado encontrado
            </p>
          ) : (
            sortedOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSelect(option.value)}
                className={cn(
                  "w-full flex items-start justify-between px-3 py-2.5 rounded-md text-sm transition-colors text-left gap-2",
                  selectedValue === option.value 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "hover:bg-muted"
                )}
              >
                <span className="flex-1 break-words leading-tight">
                  {option.value}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs h-5">
                    {option.count}
                  </Badge>
                  {selectedValue === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface FilterSheetProps {
  trigger: React.ReactNode;
}

export function FilterSheet({ trigger }: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleClearAll = () => {
    clearAllFilters();
    setSearchTerm('');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="text-xs">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Selecione os filtros para refinar sua visualização de dados
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar em todos os filtros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filters */}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              <FilterSection
                title="Origens de Vendas"
                icon={<MapPin className="h-4 w-4 text-blue-500" />}
                options={filterOptions?.sckCodes || []}
                selectedValue={sckCode}
                onSelect={setSckCode}
                searchTerm={searchTerm}
                defaultOpen={true}
              />

              <FilterSection
                title="Métodos de Pagamento"
                icon={<CreditCard className="h-4 w-4 text-green-500" />}
                options={filterOptions?.paymentMethods || []}
                selectedValue={paymentMethod}
                onSelect={setPaymentMethod}
                searchTerm={searchTerm}
              />

              <FilterSection
                title="Produtos"
                icon={<Package className="h-4 w-4 text-purple-500" />}
                options={filterOptions?.products || []}
                selectedValue={product}
                onSelect={setProduct}
                searchTerm={searchTerm}
              />

              <FilterSection
                title="Tipos de Cobrança"
                icon={<RefreshCw className="h-4 w-4 text-orange-500" />}
                options={filterOptions?.billingTypes || []}
                selectedValue={billingType}
                onSelect={setBillingType}
                searchTerm={searchTerm}
              />
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="mt-4 pt-4 border-t flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleClearAll}
            disabled={activeFiltersCount === 0}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
          <Button 
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Aplicar ({activeFiltersCount})
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
