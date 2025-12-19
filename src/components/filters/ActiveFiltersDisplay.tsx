import { X, MapPin, CreditCard, Package, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFilter } from '@/contexts/FilterContext';
import { cn } from '@/lib/utils';

interface FilterBadgeProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  onRemove: () => void;
}

function FilterBadge({ label, value, icon, color, onRemove }: FilterBadgeProps) {
  const displayValue = value.length > 20 ? `${value.slice(0, 20)}...` : value;
  const needsTooltip = value.length > 20;

  const badgeContent = (
    <Badge
      variant="secondary"
      className={cn(
        "h-7 pl-2 pr-1 gap-1.5 text-xs font-normal cursor-default transition-colors",
        color
      )}
    >
      {icon}
      <span className="max-w-[120px] truncate">{displayValue}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 ml-0.5 hover:bg-background/50 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );

  if (needsTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            <p className="font-medium text-xs mb-0.5">{label}</p>
            <p className="text-xs break-words">{value}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}

interface ActiveFiltersDisplayProps {
  className?: string;
  showClearAll?: boolean;
}

export function ActiveFiltersDisplay({ className, showClearAll = true }: ActiveFiltersDisplayProps) {
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

  if (activeFiltersCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {sckCode && (
        <FilterBadge
          label="Origem"
          value={sckCode}
          icon={<MapPin className="h-3 w-3" />}
          color="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
          onRemove={() => setSckCode(null)}
        />
      )}

      {paymentMethod && (
        <FilterBadge
          label="Pagamento"
          value={paymentMethod}
          icon={<CreditCard className="h-3 w-3" />}
          color="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
          onRemove={() => setPaymentMethod(null)}
        />
      )}

      {product && (
        <FilterBadge
          label="Produto"
          value={product}
          icon={<Package className="h-3 w-3" />}
          color="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
          onRemove={() => setProduct(null)}
        />
      )}

      {billingType && (
        <FilterBadge
          label="Tipo de Cobrança"
          value={billingType}
          icon={<RefreshCw className="h-3 w-3" />}
          color="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
          onRemove={() => setBillingType(null)}
        />
      )}

      {showClearAll && activeFiltersCount > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar todos
        </Button>
      )}
    </div>
  );
}
