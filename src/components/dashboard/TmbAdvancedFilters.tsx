import { useTmbFilterOptions } from '@/hooks/useTmbFilterOptions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Package, Globe, Megaphone, Target, Filter } from 'lucide-react';

interface TmbAdvancedFiltersProps {
  product: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  onProductChange: (value: string | null) => void;
  onUtmSourceChange: (value: string | null) => void;
  onUtmMediumChange: (value: string | null) => void;
  onUtmCampaignChange: (value: string | null) => void;
  totalFilteredTransactions?: number;
}

export function TmbAdvancedFilters({
  product,
  utmSource,
  utmMedium,
  utmCampaign,
  onProductChange,
  onUtmSourceChange,
  onUtmMediumChange,
  onUtmCampaignChange,
  totalFilteredTransactions,
}: TmbAdvancedFiltersProps) {
  const { data: filterOptions, isLoading } = useTmbFilterOptions();

  const hasActiveFilters = product || utmSource || utmMedium || utmCampaign;
  const activeFilterCount = [product, utmSource, utmMedium, utmCampaign].filter(Boolean).length;

  const clearAllFilters = () => {
    onProductChange(null);
    onUtmSourceChange(null);
    onUtmMediumChange(null);
    onUtmCampaignChange(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros Avançados TMB</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Product Filter */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Produto
          </label>
          <Select
            value={product || '_all'}
            onValueChange={(v) => onProductChange(v === '_all' ? null : v)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos os produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos os produtos</SelectItem>
              {filterOptions?.products.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.value.length > 30 ? opt.value.slice(0, 30) + '...' : opt.value} ({opt.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* UTM Source Filter */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            UTM Source
          </label>
          <Select
            value={utmSource || '_all'}
            onValueChange={(v) => onUtmSourceChange(v === '_all' ? null : v)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas as fontes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas as fontes</SelectItem>
              {filterOptions?.utm_sources.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.value} ({opt.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* UTM Medium Filter */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            UTM Medium
          </label>
          <Select
            value={utmMedium || '_all'}
            onValueChange={(v) => onUtmMediumChange(v === '_all' ? null : v)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas os meios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos os meios</SelectItem>
              {filterOptions?.utm_mediums.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.value} ({opt.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* UTM Campaign Filter */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            UTM Campaign
          </label>
          <Select
            value={utmCampaign || '_all'}
            onValueChange={(v) => onUtmCampaignChange(v === '_all' ? null : v)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas as campanhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas as campanhas</SelectItem>
              {filterOptions?.utm_campaigns.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.value.length > 25 ? opt.value.slice(0, 25) + '...' : opt.value} ({opt.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalFilteredTransactions !== undefined && (
        <p className="text-xs text-muted-foreground">
          Mostrando {totalFilteredTransactions} transações com os filtros aplicados
        </p>
      )}
    </div>
  );
}
