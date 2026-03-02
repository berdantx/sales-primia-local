import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadsPeriodFilter } from './LeadsPeriodFilter';
import { LeadsAdvancedFilterDrawer } from './LeadsAdvancedFilterDrawer';
import { DateRange } from 'react-day-picker';
import { Search, Layers, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface LeadsCompactFiltersProps {
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
  advancedFiltersCount: number;
}

export function LeadsCompactFilters({
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
  advancedFiltersCount,
}: LeadsCompactFiltersProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Period */}
        <LeadsPeriodFilter
          selectedPeriod={selectedPeriod}
          dateRange={dateRange}
          onPeriodChange={onPeriodChange}
          onDateRangeChange={onDateRangeChange}
        />

        {/* Search — prominent */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou UTM..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9 text-sm bg-background"
            />
          </div>
        </div>

        {/* Source quick filter */}
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger 
            className={`w-auto min-w-[140px] h-9 text-xs gap-1.5 px-3 transition-colors ${
              sourceFilter !== 'all' 
                ? 'border-primary bg-primary/5 text-primary' 
                : 'border-border'
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-muted-foreground">
              Todas fontes ({totalLeads})
            </SelectItem>
            {filterOptions.sources.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt} ({filterOptions.sourceCounts[opt] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-2 shrink-0"
          onClick={() => setDrawerOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {advancedFiltersCount > 0 && (
            <Badge 
              variant="default" 
              className="h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center"
            >
              {advancedFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters Drawer */}
      <LeadsAdvancedFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        countryFilter={countryFilter}
        onCountryFilterChange={onCountryFilterChange}
        utmSourceFilter={utmSourceFilter}
        onUtmSourceFilterChange={onUtmSourceFilterChange}
        utmMediumFilter={utmMediumFilter}
        onUtmMediumFilterChange={onUtmMediumFilterChange}
        utmCampaignFilter={utmCampaignFilter}
        onUtmCampaignFilterChange={onUtmCampaignFilterChange}
        utmContentFilter={utmContentFilter}
        onUtmContentFilterChange={onUtmContentFilterChange}
        utmTermFilter={utmTermFilter}
        onUtmTermFilterChange={onUtmTermFilterChange}
        qualifiedFilter={qualifiedFilter}
        onQualifiedFilterChange={onQualifiedFilterChange}
        testFilter={testFilter}
        onTestFilterChange={onTestFilterChange}
        pageFilter={pageFilter}
        onPageFilterChange={onPageFilterChange}
        trafficTypeFilter={trafficTypeFilter}
        onTrafficTypeFilterChange={onTrafficTypeFilterChange}
        showAllPages={showAllPages}
        onShowAllPages={onShowAllPages}
        totalPagesCount={totalPagesCount}
        hiddenPagesCount={hiddenPagesCount}
        totalLeads={totalLeads}
        testLeadsCount={testLeadsCount}
        filterOptions={filterOptions}
      />
    </>
  );
}
