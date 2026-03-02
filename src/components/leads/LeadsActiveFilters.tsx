import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const TRAFFIC_LABELS: Record<string, string> = {
  paid: 'Pago',
  organic: 'Orgânico',
  direct: 'Direto',
};

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface LeadsActiveFiltersProps {
  search: string;
  onSearchClear: () => void;
  sourceFilter: string;
  onSourceClear: () => void;
  countryFilter: string;
  onCountryClear: () => void;
  utmSourceFilter: string;
  onUtmSourceClear: () => void;
  utmMediumFilter: string;
  onUtmMediumClear: () => void;
  utmCampaignFilter: string;
  onUtmCampaignClear: () => void;
  utmContentFilter: string;
  onUtmContentClear: () => void;
  utmTermFilter: string;
  onUtmTermClear: () => void;
  qualifiedFilter: string;
  onQualifiedClear: () => void;
  testFilter: string;
  onTestClear: () => void;
  pageFilter: string;
  onPageClear: () => void;
  trafficTypeFilter: string;
  onTrafficTypeClear: () => void;
  selectedTopItem: string | null;
  onTopItemClear: () => void;
  onClearAll: () => void;
}

export function LeadsActiveFilters({
  search,
  onSearchClear,
  sourceFilter,
  onSourceClear,
  countryFilter,
  onCountryClear,
  utmSourceFilter,
  onUtmSourceClear,
  utmMediumFilter,
  onUtmMediumClear,
  utmCampaignFilter,
  onUtmCampaignClear,
  utmContentFilter,
  onUtmContentClear,
  utmTermFilter,
  onUtmTermClear,
  qualifiedFilter,
  onQualifiedClear,
  testFilter,
  onTestClear,
  pageFilter,
  onPageClear,
  trafficTypeFilter,
  onTrafficTypeClear,
  selectedTopItem,
  onTopItemClear,
  onClearAll,
}: LeadsActiveFiltersProps) {
  const filters: ActiveFilter[] = [];

  if (search) filters.push({ key: 'search', label: 'Busca', value: `"${search}"`, onRemove: onSearchClear });
  if (sourceFilter !== 'all') filters.push({ key: 'source', label: 'Fonte', value: sourceFilter, onRemove: onSourceClear });
  if (countryFilter !== 'all') filters.push({ key: 'country', label: 'País', value: countryFilter, onRemove: onCountryClear });
  if (utmSourceFilter !== 'all') filters.push({ key: 'utmSource', label: 'UTM Source', value: utmSourceFilter, onRemove: onUtmSourceClear });
  if (utmMediumFilter !== 'all') filters.push({ key: 'utmMedium', label: 'UTM Medium', value: utmMediumFilter, onRemove: onUtmMediumClear });
  if (utmCampaignFilter !== 'all') filters.push({ key: 'utmCampaign', label: 'Campanha', value: utmCampaignFilter, onRemove: onUtmCampaignClear });
  if (utmContentFilter !== 'all') filters.push({ key: 'utmContent', label: 'Conteúdo', value: utmContentFilter, onRemove: onUtmContentClear });
  if (utmTermFilter !== 'all') filters.push({ key: 'utmTerm', label: 'Termo', value: utmTermFilter, onRemove: onUtmTermClear });
  if (qualifiedFilter !== 'all') filters.push({ key: 'qualified', label: 'Qualificação', value: qualifiedFilter === 'qualified' ? 'Qualificados' : 'Não qualificados', onRemove: onQualifiedClear });
  if (testFilter !== 'hide') filters.push({ key: 'test', label: 'Testes', value: testFilter === 'all' ? 'Todos' : 'Apenas testes', onRemove: onTestClear });
  if (pageFilter !== 'all') filters.push({ key: 'page', label: 'Página', value: pageFilter, onRemove: onPageClear });
  if (trafficTypeFilter !== 'all') filters.push({ key: 'traffic', label: 'Tráfego', value: TRAFFIC_LABELS[trafficTypeFilter] || trafficTypeFilter, onRemove: onTrafficTypeClear });
  if (selectedTopItem) filters.push({ key: 'topItem', label: 'Selecionado', value: selectedTopItem.length > 30 ? selectedTopItem.slice(0, 30) + '...' : selectedTopItem, onRemove: onTopItemClear });

  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium shrink-0">Filtros ativos:</span>
      {filters.map((f) => (
        <Badge
          key={f.key}
          variant="secondary"
          className="gap-1 text-xs font-normal pl-2.5 pr-1 py-0.5 h-6 max-w-[200px]"
        >
          <span className="truncate">{f.value}</span>
          <button
            onClick={f.onRemove}
            className="ml-0.5 p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
      >
        Limpar todos
      </Button>
    </div>
  );
}
