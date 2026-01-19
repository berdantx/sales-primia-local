import { useEduzzFilterOptions } from '@/hooks/useEduzzFilterOptions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Package, Globe, Megaphone, Target, Filter, Loader2, Speaker } from 'lucide-react';
import { motion } from 'framer-motion';

interface EduzzAdvancedFiltersProps {
  product: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  onProductChange: (value: string | null) => void;
  onUtmSourceChange: (value: string | null) => void;
  onUtmMediumChange: (value: string | null) => void;
  onUtmCampaignChange: (value: string | null) => void;
  onUtmContentChange: (value: string | null) => void;
  totalFilteredTransactions?: number;
}

export function EduzzAdvancedFilters({
  product,
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
  onProductChange,
  onUtmSourceChange,
  onUtmMediumChange,
  onUtmCampaignChange,
  onUtmContentChange,
  totalFilteredTransactions,
}: EduzzAdvancedFiltersProps) {
  const { data: filterOptions, isLoading } = useEduzzFilterOptions();

  const hasActiveFilters = product || utmSource || utmMedium || utmCampaign || utmContent;

  const clearAllFilters = () => {
    onProductChange(null);
    onUtmSourceChange(null);
    onUtmMediumChange(null);
    onUtmCampaignChange(null);
    onUtmContentChange(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando filtros...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros Avançados Eduzz</span>
                {totalFilteredTransactions !== undefined && (
                  <Badge variant="secondary" className="ml-2">
                    {totalFilteredTransactions} transações
                  </Badge>
                )}
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Product Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Produto
                </label>
                <Select
                  value={product || 'all'}
                  onValueChange={(v) => onProductChange(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os produtos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    {filterOptions?.products?.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="truncate max-w-[200px]">{p.value}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {p.count}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Source Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  UTM Source
                </label>
                <Select
                  value={utmSource || 'all'}
                  onValueChange={(v) => onUtmSourceChange(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as fontes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    {filterOptions?.utm_sources?.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.value}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {s.count}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Medium Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  UTM Medium
                </label>
                <Select
                  value={utmMedium || 'all'}
                  onValueChange={(v) => onUtmMediumChange(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as mídias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as mídias</SelectItem>
                    {filterOptions?.utm_mediums?.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.value}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {m.count}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Campaign Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Megaphone className="h-3 w-3" />
                  UTM Campaign
                </label>
                <Select
                  value={utmCampaign || 'all'}
                  onValueChange={(v) => onUtmCampaignChange(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as campanhas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    {filterOptions?.utm_campaigns?.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="truncate max-w-[180px]">{c.value}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {c.count}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Content (Anúncio) Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Speaker className="h-3 w-3" />
                  Anúncio
                </label>
                <Select
                  value={utmContent || 'all'}
                  onValueChange={(v) => onUtmContentChange(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os anúncios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anúncios</SelectItem>
                    {filterOptions?.utm_contents?.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="truncate max-w-[180px]">{c.value}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {c.count}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {product && (
                  <Badge variant="secondary" className="gap-1">
                    <Package className="h-3 w-3" />
                    {product.length > 20 ? product.slice(0, 20) + '...' : product}
                    <button onClick={() => onProductChange(null)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {utmSource && (
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="h-3 w-3" />
                    {utmSource}
                    <button onClick={() => onUtmSourceChange(null)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {utmMedium && (
                  <Badge variant="secondary" className="gap-1">
                    <Target className="h-3 w-3" />
                    {utmMedium}
                    <button onClick={() => onUtmMediumChange(null)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {utmCampaign && (
                  <Badge variant="secondary" className="gap-1">
                    <Megaphone className="h-3 w-3" />
                    {utmCampaign.length > 15 ? utmCampaign.slice(0, 15) + '...' : utmCampaign}
                    <button onClick={() => onUtmCampaignChange(null)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {utmContent && (
                  <Badge variant="secondary" className="gap-1">
                    <Speaker className="h-3 w-3" />
                    {utmContent.length > 15 ? utmContent.slice(0, 15) + '...' : utmContent}
                    <button onClick={() => onUtmContentChange(null)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
