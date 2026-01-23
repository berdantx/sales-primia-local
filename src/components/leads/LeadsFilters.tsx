import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadsPeriodFilter } from './LeadsPeriodFilter';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Search,
  Globe,
  FlaskConical,
  FileText,
  Target,
  X,
  Layers,
  Link2,
  Megaphone,
  Tag,
  MousePointerClick,
  SlidersHorizontal,
} from 'lucide-react';

interface FilterOptions {
  sources: string[];
  countries: string[];
  utmSources: string[];
  utmMediums: string[];
  utmCampaigns: string[];
  utmContents: string[];
  utmTerms: string[];
  pages: string[];
  trafficTypes: string[];
  sourceCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  utmSourceCounts: Record<string, number>;
  utmMediumCounts: Record<string, number>;
  utmCampaignCounts: Record<string, number>;
  utmContentCounts: Record<string, number>;
  utmTermCounts: Record<string, number>;
  pageCounts: Record<string, number>;
  trafficTypeCounts: Record<string, number>;
}

interface LeadsFiltersProps {
  selectedPeriod: string;
  dateRange: DateRange | undefined;
  onPeriodChange: (period: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  countryFilter: string;
  onCountryFilterChange: (value: string) => void;
  utmSourceFilter: string;
  onUtmSourceFilterChange: (value: string) => void;
  utmMediumFilter: string;
  onUtmMediumFilterChange: (value: string) => void;
  utmCampaignFilter: string;
  onUtmCampaignFilterChange: (value: string) => void;
  utmContentFilter: string;
  onUtmContentFilterChange: (value: string) => void;
  utmTermFilter: string;
  onUtmTermFilterChange: (value: string) => void;
  qualifiedFilter: string;
  onQualifiedFilterChange: (value: string) => void;
  testFilter: string;
  onTestFilterChange: (value: string) => void;
  pageFilter: string;
  onPageFilterChange: (value: string) => void;
  trafficTypeFilter: string;
  onTrafficTypeFilterChange: (value: string) => void;
  showAllPages: boolean;
  onShowAllPages: () => void;
  totalPagesCount: number;
  hiddenPagesCount: number;
  totalLeads: number;
  testLeadsCount: number;
  filterOptions: FilterOptions;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

// Helper component for filter select with consistent styling
function FilterSelect({
  value,
  onValueChange,
  placeholder,
  icon: Icon,
  options,
  counts,
  allLabel,
  allCount,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  icon?: React.ElementType;
  options: string[];
  counts: Record<string, number>;
  allLabel: string;
  allCount?: number;
}) {
  const isActive = value !== 'all';
  
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger 
        className={`w-auto min-w-[100px] h-9 text-xs gap-1.5 px-3 border-dashed transition-colors ${
          isActive 
            ? 'border-primary bg-primary/5 text-primary' 
            : 'border-muted-foreground/30 hover:border-muted-foreground/50'
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-muted-foreground">
          {allLabel} {allCount !== undefined && `(${allCount})`}
        </SelectItem>
        {options.map(opt => (
          <SelectItem key={opt} value={opt}>
            {opt} ({counts[opt] || 0})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LeadsFilters({
  selectedPeriod,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
  search,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  countryFilter,
  onCountryFilterChange,
  utmSourceFilter,
  onUtmSourceFilterChange,
  utmMediumFilter,
  onUtmMediumFilterChange,
  utmCampaignFilter,
  onUtmCampaignFilterChange,
  utmContentFilter,
  onUtmContentFilterChange,
  utmTermFilter,
  onUtmTermFilterChange,
  qualifiedFilter,
  onQualifiedFilterChange,
  testFilter,
  onTestFilterChange,
  pageFilter,
  onPageFilterChange,
  trafficTypeFilter,
  onTrafficTypeFilterChange,
  showAllPages,
  onShowAllPages,
  totalPagesCount,
  hiddenPagesCount,
  totalLeads,
  testLeadsCount,
  filterOptions,
  hasActiveFilters,
  onClearFilters,
}: LeadsFiltersProps) {
  // Count active filters for badge
  const activeFiltersCount = [
    sourceFilter !== 'all',
    countryFilter !== 'all',
    utmSourceFilter !== 'all',
    utmMediumFilter !== 'all',
    utmCampaignFilter !== 'all',
    utmContentFilter !== 'all',
    utmTermFilter !== 'all',
    qualifiedFilter !== 'all',
    testFilter !== 'hide',
    pageFilter !== 'all',
    trafficTypeFilter !== 'all',
    search.length > 0,
  ].filter(Boolean).length;

  const TRAFFIC_LABELS: Record<string, string> = {
    paid: '💰 Pago',
    organic: '🌱 Orgânico',
    direct: '🔗 Direto',
  };

  // Check if Primia filter is active
  const isPrimiaActive = sourceFilter === 'primia';
  const primiaCount = filterOptions.sourceCounts['primia'] || 0;

  return (
    <Card className="p-4 space-y-4 bg-card/50 backdrop-blur-sm border-border/50">
      {/* Section Title with Quick Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Filtros de Leads</h3>
        
        {/* Quick Filter: Primia - Whatsapp */}
        {primiaCount > 0 && (
          <Button
            variant={isPrimiaActive ? "default" : "outline"}
            size="sm"
            onClick={() => onSourceFilterChange(isPrimiaActive ? 'all' : 'primia')}
            className={`h-7 text-xs gap-1.5 ${
              isPrimiaActive 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'border-purple-500/30 text-purple-600 hover:bg-purple-500/10'
            }`}
          >
            <span className="text-sm">📱</span>
            Primia - Whatsapp
            <Badge 
              variant="secondary" 
              className={`ml-1 h-5 px-1.5 text-[10px] ${
                isPrimiaActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-purple-500/10 text-purple-600'
              }`}
            >
              {primiaCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Header with period and search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <LeadsPeriodFilter
          selectedPeriod={selectedPeriod}
          dateRange={dateRange}
          onPeriodChange={onPeriodChange}
          onDateRangeChange={onDateRangeChange}
        />
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar email, nome, telefone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9 text-sm bg-background"
            />
          </div>
        </div>
        
        {/* Active filters badge and clear */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <Badge variant="secondary" className="gap-1 text-xs font-normal">
              <SlidersHorizontal className="h-3 w-3" />
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters} 
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Filter Groups */}
      <div className="space-y-3">
        {/* Primary Filters: Source & Location */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
            Origem
          </span>
          
          <FilterSelect
            value={sourceFilter}
            onValueChange={onSourceFilterChange}
            placeholder="Fonte"
            icon={Layers}
            options={filterOptions.sources}
            counts={filterOptions.sourceCounts}
            allLabel="Todas fontes"
            allCount={totalLeads}
          />

          <FilterSelect
            value={countryFilter}
            onValueChange={onCountryFilterChange}
            placeholder="País"
            icon={Globe}
            options={filterOptions.countries}
            counts={filterOptions.countryCounts}
            allLabel="Todos países"
          />

          <FilterSelect
            value={pageFilter === 'all' ? 'all' : pageFilter}
            onValueChange={(v) => {
              if (v === '__show_all__') {
                onShowAllPages();
              } else {
                onPageFilterChange(v);
              }
            }}
            placeholder="Página"
            icon={FileText}
            options={[
              ...filterOptions.pages.filter(p => showAllPages || filterOptions.pageCounts[p] >= 5),
              ...(!showAllPages && hiddenPagesCount > 0 ? ['__show_all__'] : [])
            ]}
            counts={{
              ...Object.fromEntries(
                filterOptions.pages.map(p => [`/${p}`, filterOptions.pageCounts[p]])
              ),
              '__show_all__': hiddenPagesCount
            }}
            allLabel="Todas páginas"
            allCount={totalPagesCount - hiddenPagesCount}
          />
        </div>

        {/* UTM Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
            UTMs
          </span>

          <FilterSelect
            value={utmSourceFilter}
            onValueChange={onUtmSourceFilterChange}
            placeholder="Source"
            icon={Link2}
            options={filterOptions.utmSources}
            counts={filterOptions.utmSourceCounts}
            allLabel="Todos"
          />

          <FilterSelect
            value={utmMediumFilter}
            onValueChange={onUtmMediumFilterChange}
            placeholder="Medium"
            icon={Megaphone}
            options={filterOptions.utmMediums}
            counts={filterOptions.utmMediumCounts}
            allLabel="Todos"
          />

          <FilterSelect
            value={utmCampaignFilter}
            onValueChange={onUtmCampaignFilterChange}
            placeholder="Campaign"
            icon={Target}
            options={filterOptions.utmCampaigns}
            counts={filterOptions.utmCampaignCounts}
            allLabel="Todos"
          />

          <FilterSelect
            value={utmContentFilter}
            onValueChange={onUtmContentFilterChange}
            placeholder="Content"
            icon={MousePointerClick}
            options={filterOptions.utmContents}
            counts={filterOptions.utmContentCounts}
            allLabel="Todos"
          />

          <FilterSelect
            value={utmTermFilter}
            onValueChange={onUtmTermFilterChange}
            placeholder="Term"
            icon={Tag}
            options={filterOptions.utmTerms}
            counts={filterOptions.utmTermCounts}
            allLabel="Todos"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
            Status
          </span>

          {/* Traffic Type Filter */}
          <Select value={trafficTypeFilter} onValueChange={onTrafficTypeFilterChange}>
            <SelectTrigger 
              className={`w-auto min-w-[120px] h-9 text-xs gap-1.5 px-3 border-dashed transition-colors ${
                trafficTypeFilter !== 'all' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
              }`}
            >
              <Megaphone className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder="Tráfego" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-muted-foreground">
                Todo tráfego ({totalLeads})
              </SelectItem>
              {filterOptions.trafficTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {TRAFFIC_LABELS[type] || type} ({filterOptions.trafficTypeCounts[type] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={qualifiedFilter} onValueChange={onQualifiedFilterChange}>
            <SelectTrigger 
              className={`w-auto min-w-[120px] h-9 text-xs gap-1.5 px-3 border-dashed transition-colors ${
                qualifiedFilter !== 'all' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
              }`}
            >
              <Target className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder="Qualificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-muted-foreground">Todos leads</SelectItem>
              <SelectItem value="qualified">✓ Qualificados</SelectItem>
              <SelectItem value="unqualified">✗ Não qualificados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={testFilter} onValueChange={onTestFilterChange}>
            <SelectTrigger 
              className={`w-auto min-w-[130px] h-9 text-xs gap-1.5 px-3 border-dashed transition-colors ${
                testFilter !== 'hide' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder="Testes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hide">Ocultar testes</SelectItem>
              <SelectItem value="all">Mostrar todos</SelectItem>
              <SelectItem value="only">Apenas testes ({testLeadsCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
