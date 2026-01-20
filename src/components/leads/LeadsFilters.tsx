import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadsPeriodFilter } from './LeadsPeriodFilter';
import { DateRange } from 'react-day-picker';
import {
  Search,
  Globe,
  FlaskConical,
  FileText,
  Target,
  X,
  Layers,
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
  sourceCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  utmSourceCounts: Record<string, number>;
  utmMediumCounts: Record<string, number>;
  utmCampaignCounts: Record<string, number>;
  utmContentCounts: Record<string, number>;
  utmTermCounts: Record<string, number>;
  pageCounts: Record<string, number>;
}

interface LeadsFiltersProps {
  // Period filter
  selectedPeriod: string;
  dateRange: DateRange | undefined;
  onPeriodChange: (period: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  // Search
  search: string;
  onSearchChange: (value: string) => void;
  // Filters
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
  // Page options
  showAllPages: boolean;
  onShowAllPages: () => void;
  totalPagesCount: number;
  hiddenPagesCount: number;
  // Counts
  totalLeads: number;
  testLeadsCount: number;
  // Filter options
  filterOptions: FilterOptions;
  // Actions
  hasActiveFilters: boolean;
  onClearFilters: () => void;
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
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Period + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <LeadsPeriodFilter
          selectedPeriod={selectedPeriod}
          dateRange={dateRange}
          onPeriodChange={onPeriodChange}
          onDateRangeChange={onDateRangeChange}
        />
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar email, nome, telefone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Main filters - Source, Country, UTMs */}
      <div className="flex flex-wrap gap-2">
        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-auto min-w-[130px] h-8 text-xs gap-1 px-2.5">
            <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas fontes ({totalLeads})</SelectItem>
            {filterOptions.sources.map(s => (
              <SelectItem key={s} value={s}>
                {s} ({filterOptions.sourceCounts[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Country Filter */}
        <Select value={countryFilter} onValueChange={onCountryFilterChange}>
          <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs gap-1 px-2.5">
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos países</SelectItem>
            {filterOptions.countries.map(c => (
              <SelectItem key={c} value={c}>
                {c} ({filterOptions.countryCounts[c]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* UTM Source */}
        <Select value={utmSourceFilter} onValueChange={onUtmSourceFilterChange}>
          <SelectTrigger className="w-auto min-w-[110px] h-8 text-xs gap-1 px-2.5">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Source</SelectItem>
            {filterOptions.utmSources.map(s => (
              <SelectItem key={s} value={s}>
                {s} ({filterOptions.utmSourceCounts[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* UTM Medium */}
        <Select value={utmMediumFilter} onValueChange={onUtmMediumFilterChange}>
          <SelectTrigger className="w-auto min-w-[110px] h-8 text-xs gap-1 px-2.5">
            <SelectValue placeholder="Medium" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Medium</SelectItem>
            {filterOptions.utmMediums.map(s => (
              <SelectItem key={s} value={s}>
                {s} ({filterOptions.utmMediumCounts[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* UTM Campaign */}
        <Select value={utmCampaignFilter} onValueChange={onUtmCampaignFilterChange}>
          <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs gap-1 px-2.5">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Campaign</SelectItem>
            {filterOptions.utmCampaigns.map(s => (
              <SelectItem key={s} value={s}>
                {s} ({filterOptions.utmCampaignCounts[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* UTM Content */}
        <Select value={utmContentFilter} onValueChange={onUtmContentFilterChange}>
          <SelectTrigger className="w-auto min-w-[110px] h-8 text-xs gap-1 px-2.5">
            <SelectValue placeholder="Content" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Content</SelectItem>
            {filterOptions.utmContents.map(s => (
              <SelectItem key={s} value={s}>
                {s} ({filterOptions.utmContentCounts[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* UTM Term */}
        <Select value={utmTermFilter} onValueChange={onUtmTermFilterChange}>
          <SelectTrigger className="w-auto min-w-[100px] h-8 text-xs gap-1 px-2.5">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Term</SelectItem>
            {filterOptions.utmTerms.map(s => (
              <SelectItem key={s} value={s}>
                {s} ({filterOptions.utmTermCounts[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Qualified Filter */}
        <Select value={qualifiedFilter} onValueChange={onQualifiedFilterChange}>
          <SelectTrigger className="w-auto min-w-[110px] h-8 text-xs gap-1 px-2.5">
            <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Qualificados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos leads</SelectItem>
            <SelectItem value="qualified">Qualificados</SelectItem>
            <SelectItem value="unqualified">Não qualificados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 3: Secondary filters - Tests, Pages, Clear */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Test Filter */}
        <Select value={testFilter} onValueChange={onTestFilterChange}>
          <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs gap-1 px-2.5">
            <FlaskConical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Testes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hide">Ocultar testes</SelectItem>
            <SelectItem value="all">Mostrar todos</SelectItem>
            <SelectItem value="only">Apenas testes ({testLeadsCount})</SelectItem>
          </SelectContent>
        </Select>

        {/* Page Filter */}
        <Select 
          value={pageFilter} 
          onValueChange={(v) => {
            if (v === '__show_all__') {
              onShowAllPages();
            } else {
              onPageFilterChange(v);
            }
          }}
        >
          <SelectTrigger className="w-auto min-w-[150px] max-w-[200px] h-8 text-xs gap-1 px-2.5">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {pageFilter === 'all' 
                ? `Todas páginas ativas..` 
                : `/${pageFilter.length > 15 ? pageFilter.slice(0, 15) + '...' : pageFilter}`
              }
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas páginas ativas ({totalPagesCount - hiddenPagesCount})</SelectItem>
            {filterOptions.pages
              .filter(p => showAllPages || filterOptions.pageCounts[p] >= 5)
              .map(p => (
                <SelectItem key={p} value={p}>
                  /{p} ({filterOptions.pageCounts[p]})
                </SelectItem>
              ))}
            {!showAllPages && hiddenPagesCount > 0 && (
              <SelectItem value="__show_all__" className="text-muted-foreground italic">
                Mostrar inativas ({hiddenPagesCount})
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters} 
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
