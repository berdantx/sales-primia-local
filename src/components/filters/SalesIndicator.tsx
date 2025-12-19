import { BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCombinedFilterOptions } from '@/hooks/useCombinedFilterOptions';
import { useFilter } from '@/contexts/FilterContext';
import { cn } from '@/lib/utils';

function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR');
}

export function SalesIndicator() {
  const { totals, isLoading } = useCombinedFilterOptions();
  const { activeFiltersCount, platform } = useFilter();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 animate-pulse">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    );
  }

  // Determinar o total filtrado baseado na plataforma selecionada
  const getFilteredTotal = () => {
    switch (platform) {
      case 'hotmart':
        return totals.hotmart;
      case 'tmb':
        return totals.tmb;
      default:
        return totals.combined;
    }
  };

  const filteredTotal = getFilteredTotal();
  const totalSales = totals.combined;
  const percentage = totalSales > 0 ? (filteredTotal / totalSales) * 100 : 0;
  const hasFilters = activeFiltersCount > 0 || platform !== 'all';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors cursor-default",
              hasFilters 
                ? "bg-primary/10 border border-primary/20" 
                : "bg-muted/50 border border-transparent"
            )}
          >
            <BarChart3 className={cn(
              "h-4 w-4",
              hasFilters ? "text-primary" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-sm font-medium tabular-nums",
              hasFilters ? "text-primary" : "text-foreground"
            )}>
              {hasFilters ? (
                <>
                  <span className="font-semibold">{formatNumber(filteredTotal)}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-muted-foreground">{formatNumber(totalSales)}</span>
                </>
              ) : (
                formatNumber(totalSales)
              )}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              vendas
            </span>
            {hasFilters && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                {Math.round(percentage)}%
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-3">
          <div className="space-y-2">
            <p className="font-medium text-sm">Resumo de Vendas</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Hotmart:</span>
                <span className="font-medium tabular-nums">{formatNumber(totals.hotmart)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">TMB:</span>
                <span className="font-medium tabular-nums">{formatNumber(totals.tmb)}</span>
              </div>
              <div className="border-t pt-1 mt-1 flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold tabular-nums">{formatNumber(totals.combined)}</span>
              </div>
            </div>
            {hasFilters && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Mostrando {Math.round(percentage)}% do total
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
