import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Globe,
  FileText,
  Link2,
  Megaphone,
  Target,
  MousePointerClick,
  Tag,
  FlaskConical,
} from 'lucide-react';

interface FilterOptions {
  countries: string[];
  utmSources: string[];
  utmMediums: string[];
  utmCampaigns: string[];
  utmContents: string[];
  utmTerms: string[];
  pages: string[];
  trafficTypes: string[];
  countryCounts: Record<string, number>;
  utmSourceCounts: Record<string, number>;
  utmMediumCounts: Record<string, number>;
  utmCampaignCounts: Record<string, number>;
  utmContentCounts: Record<string, number>;
  utmTermCounts: Record<string, number>;
  pageCounts: Record<string, number>;
  trafficTypeCounts: Record<string, number>;
}

interface LeadsAdvancedFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}

const TRAFFIC_LABELS: Record<string, string> = {
  paid: '💰 Pago',
  organic: '🌱 Orgânico',
  direct: '🔗 Direto',
};

function FilterField({
  label,
  icon: Icon,
  value,
  onValueChange,
  options,
  counts,
  allLabel,
  allCount,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  counts: Record<string, number>;
  allLabel: string;
  allCount?: number;
  labelMap?: Record<string, string>;
}) {
  const isActive = value !== 'all';
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={`h-9 text-xs ${isActive ? 'border-primary bg-primary/5 text-primary' : ''}`}>
          <SelectValue />
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
    </div>
  );
}

export function LeadsAdvancedFilterDrawer({
  open,
  onOpenChange,
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
}: LeadsAdvancedFilterDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[340px] sm:w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Filtros Avançados</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Origem & Localização */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Origem & Localização
            </h4>

            <FilterField
              label="País"
              icon={Globe}
              value={countryFilter}
              onValueChange={onCountryFilterChange}
              options={filterOptions.countries}
              counts={filterOptions.countryCounts}
              allLabel="Todos países"
            />

            <FilterField
              label="Página"
              icon={FileText}
              value={pageFilter}
              onValueChange={(v) => {
                if (v === '__show_all__') {
                  onShowAllPages();
                } else {
                  onPageFilterChange(v);
                }
              }}
              options={[
                ...filterOptions.pages.filter(p => showAllPages || filterOptions.pageCounts[p] >= 5),
                ...(!showAllPages && hiddenPagesCount > 0 ? ['__show_all__'] : []),
              ]}
              counts={{
                ...filterOptions.pageCounts,
                '__show_all__': hiddenPagesCount,
              }}
              allLabel="Todas páginas"
              allCount={totalPagesCount - hiddenPagesCount}
            />
          </div>

          <Separator />

          {/* UTMs */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Parâmetros UTM
            </h4>

            <FilterField label="Source" icon={Link2} value={utmSourceFilter} onValueChange={onUtmSourceFilterChange} options={filterOptions.utmSources} counts={filterOptions.utmSourceCounts} allLabel="Todos" />
            <FilterField label="Medium" icon={Megaphone} value={utmMediumFilter} onValueChange={onUtmMediumFilterChange} options={filterOptions.utmMediums} counts={filterOptions.utmMediumCounts} allLabel="Todos" />
            <FilterField label="Campaign" icon={Target} value={utmCampaignFilter} onValueChange={onUtmCampaignFilterChange} options={filterOptions.utmCampaigns} counts={filterOptions.utmCampaignCounts} allLabel="Todos" />
            <FilterField label="Content" icon={MousePointerClick} value={utmContentFilter} onValueChange={onUtmContentFilterChange} options={filterOptions.utmContents} counts={filterOptions.utmContentCounts} allLabel="Todos" />
            <FilterField label="Term" icon={Tag} value={utmTermFilter} onValueChange={onUtmTermFilterChange} options={filterOptions.utmTerms} counts={filterOptions.utmTermCounts} allLabel="Todos" />
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status & Tráfego
            </h4>

            {/* Traffic Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5" />
                Tipo de Tráfego
              </Label>
              <Select value={trafficTypeFilter} onValueChange={onTrafficTypeFilterChange}>
                <SelectTrigger className={`h-9 text-xs ${trafficTypeFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-muted-foreground">Todo tráfego ({totalLeads})</SelectItem>
                  {filterOptions.trafficTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {TRAFFIC_LABELS[type] || type} ({filterOptions.trafficTypeCounts[type] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Qualified */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Qualificação
              </Label>
              <Select value={qualifiedFilter} onValueChange={onQualifiedFilterChange}>
                <SelectTrigger className={`h-9 text-xs ${qualifiedFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-muted-foreground">Todos leads</SelectItem>
                  <SelectItem value="qualified">✓ Qualificados</SelectItem>
                  <SelectItem value="unqualified">✗ Não qualificados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Test Leads */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                Leads de Teste
              </Label>
              <Select value={testFilter} onValueChange={onTestFilterChange}>
                <SelectTrigger className={`h-9 text-xs ${testFilter !== 'hide' ? 'border-primary bg-primary/5 text-primary' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hide">Ocultar testes</SelectItem>
                  <SelectItem value="all">Mostrar todos</SelectItem>
                  <SelectItem value="only">Apenas testes ({testLeadsCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
