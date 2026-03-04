import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, FileText, Loader2, CalendarIcon, Building2, FileDown, Filter } from 'lucide-react';

import { generateExcelReport } from '@/lib/export/generateExcelReport';
import { generateCsvReport } from '@/lib/export/generateCsvReport';
import { generatePdfReport } from '@/lib/export/generatePdfReport';
import { useTransactions } from '@/hooks/useTransactions';
import { useTmbTransactions } from '@/hooks/useTmbTransactions';
import { useEduzzTransactions } from '@/hooks/useEduzzTransactions';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useTmbFilterOptions } from '@/hooks/useTmbFilterOptions';
import { useEduzzFilterOptions } from '@/hooks/useEduzzFilterOptions';
import { toast } from 'sonner';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ExportReportDialogProps {
  trigger?: React.ReactNode;
  defaultClientId?: string | null;
}

type PeriodOption = 'all' | '7days' | '30days' | '90days' | '1year' | 'custom';
type ExportFormat = 'excel' | 'csv' | 'pdf';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '90days', label: 'Últimos 90 dias' },
  { value: '1year', label: 'Último ano' },
  { value: 'custom', label: 'Personalizado' },
] as const;

function getPeriodDates(period: PeriodOption): { start: Date; end: Date } | null {
  const now = new Date();
  const end = endOfDay(now);

  switch (period) {
    case '7days':
      return { start: startOfDay(subDays(now, 7)), end };
    case '30days':
      return { start: startOfDay(subDays(now, 30)), end };
    case '90days':
      return { start: startOfDay(subDays(now, 90)), end };
    case '1year':
      return { start: startOfDay(subYears(now, 1)), end };
    case 'all':
    case 'custom':
    default:
      return null;
  }
}

export function ExportReportDialog({ trigger, defaultClientId }: ExportReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(defaultClientId || null);
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [options, setOptions] = useState({
    includeHotmart: true,
    includeTmb: true,
    includeEduzz: true,
    includeSummary: true,
    includeCombined: true,
  });
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');

  const { data: clients } = useClients();
  const { isMaster } = useUserRole();
  const { data: hotmartOptions } = useFilterOptions();
  const { data: tmbOptions } = useTmbFilterOptions();
  const { data: eduzzOptions } = useEduzzFilterOptions();

  // Unify UTM options from all platforms
  const allSources = useMemo(() => {
    const set = new Set<string>();
    hotmartOptions?.sckCodes?.forEach((o) => o.value && set.add(o.value));
    tmbOptions?.utm_sources?.forEach((o) => o.value && set.add(o.value));
    eduzzOptions?.utm_sources?.forEach((o) => o.value && set.add(o.value));
    return Array.from(set).sort();
  }, [hotmartOptions, tmbOptions, eduzzOptions]);

  const allMediums = useMemo(() => {
    const set = new Set<string>();
    tmbOptions?.utm_mediums?.forEach((o) => o.value && set.add(o.value));
    eduzzOptions?.utm_mediums?.forEach((o) => o.value && set.add(o.value));
    return Array.from(set).sort();
  }, [tmbOptions, eduzzOptions]);

  const allCampaigns = useMemo(() => {
    const set = new Set<string>();
    tmbOptions?.utm_campaigns?.forEach((o) => o.value && set.add(o.value));
    eduzzOptions?.utm_campaigns?.forEach((o) => o.value && set.add(o.value));
    return Array.from(set).sort();
  }, [tmbOptions, eduzzOptions]);

  const allContents = useMemo(() => {
    const set = new Set<string>();
    eduzzOptions?.utm_contents?.forEach((o) => o.value && set.add(o.value));
    return Array.from(set).sort();
  }, [eduzzOptions]);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    if (period === 'custom' && customDateRange?.from) {
      return {
        start: startOfDay(customDateRange.from),
        end: customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from),
      };
    }
    return getPeriodDates(period);
  }, [period, customDateRange]);

  // Build filters for hooks
  const filters = useMemo(() => ({
    clientId: selectedClientId || undefined,
    startDate: dateRange?.start,
    endDate: dateRange?.end,
  }), [selectedClientId, dateRange]);

  // Fetch data with filters
  const { data: hotmartTransactions, isLoading: loadingHotmart } = useTransactions(filters);
  const { data: tmbTransactions, isLoading: loadingTmb } = useTmbTransactions(filters);
  const { data: eduzzTransactions, isLoading: loadingEduzz } = useEduzzTransactions(filters);

  const isLoading = loadingHotmart || loadingTmb || loadingEduzz;

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  const hasUtmFilter = utmSource || utmMedium || utmCampaign || utmContent;

  const matchesUtm = (fields: Record<string, string | null | undefined>) => {
    if (!hasUtmFilter) return true;
    const match = (filter: string, value: string | null | undefined) => {
      if (!filter) return true;
      return (value || '').toLowerCase() === filter.toLowerCase();
    };
    return (
      match(utmSource, fields.source) &&
      match(utmMedium, fields.medium) &&
      match(utmCampaign, fields.campaign) &&
      match(utmContent, fields.content)
    );
  };

  const filteredHotmart = useMemo(() => {
    if (!hotmartTransactions) return [];
    if (!hasUtmFilter) return hotmartTransactions;
    return hotmartTransactions.filter((t) =>
      matchesUtm({ source: (t as any).sck_code })
    );
  }, [hotmartTransactions, utmSource, utmMedium, utmCampaign, utmContent]);

  const filteredTmb = useMemo(() => {
    if (!tmbTransactions) return [];
    if (!hasUtmFilter) return tmbTransactions;
    return tmbTransactions.filter((t) =>
      matchesUtm({ source: t.utm_source, medium: t.utm_medium, campaign: t.utm_campaign, content: (t as any).utm_content })
    );
  }, [tmbTransactions, utmSource, utmMedium, utmCampaign, utmContent]);

  const filteredEduzz = useMemo(() => {
    if (!eduzzTransactions) return [];
    if (!hasUtmFilter) return eduzzTransactions;
    return eduzzTransactions.filter((t) =>
      matchesUtm({ source: t.utm_source, medium: (t as any).utm_medium, campaign: (t as any).utm_campaign, content: (t as any).utm_content })
    );
  }, [eduzzTransactions, utmSource, utmMedium, utmCampaign, utmContent]);

  const transactionCount = filteredHotmart.length + filteredTmb.length + filteredEduzz.length;

  // Recalculate stats from filtered data so summary matches UTM-filtered transactions
  const computedHotmartStats = useMemo(() => {
    const brl = filteredHotmart.filter(t => t.currency === 'BRL').reduce((s, t) => s + Number(t.computed_value), 0);
    const usd = filteredHotmart.filter(t => t.currency === 'USD').reduce((s, t) => s + Number(t.computed_value), 0);
    return { totalBRL: brl, totalUSD: usd, totalTransactions: filteredHotmart.length };
  }, [filteredHotmart]);

  const computedTmbStats = useMemo(() => {
    const total = filteredTmb.reduce((s, t) => s + Number(t.ticket_value), 0);
    return { totalBRL: total, totalTransactions: filteredTmb.length };
  }, [filteredTmb]);

  const computedEduzzStats = useMemo(() => {
    const total = filteredEduzz.reduce((s, t) => s + Number(t.sale_value), 0);
    return { totalBRL: total, totalTransactions: filteredEduzz.length };
  }, [filteredEduzz]);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const exportData = {
        hotmartTransactions: filteredHotmart,
        tmbTransactions: filteredTmb,
        eduzzTransactions: filteredEduzz,
        hotmartStats: computedHotmartStats,
        tmbStats: computedTmbStats,
        eduzzStats: computedEduzzStats,
      };

      const exportOptions = {
        ...options,
        dateRange,
        clientName: selectedClient?.name,
      };

      if (exportFormat === 'excel') {
        generateExcelReport(exportData, exportOptions);
      } else if (exportFormat === 'pdf') {
        generatePdfReport(exportData, exportOptions);
      } else {
        generateCsvReport(exportData, exportOptions);
      }

      toast.success(`Relatório ${exportFormat.toUpperCase()} exportado com sucesso!`);
      setOpen(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnySelected = exportFormat === 'excel' 
    ? Object.values(options).some(Boolean)
    : options.includeHotmart || options.includeTmb || options.includeEduzz || options.includeCombined;

  const formatPeriodDisplay = () => {
    if (period === 'all') return 'Todo o período';
    if (period === 'custom' && customDateRange?.from) {
      const from = format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR });
      const to = customDateRange.to 
        ? format(customDateRange.to, 'dd/MM/yyyy', { locale: ptBR })
        : from;
      return `${from} - ${to}`;
    }
    return PERIOD_OPTIONS.find((p) => p.value === period)?.label || '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Relatório
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
          {/* LEFT COLUMN - Filters */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filtros</h3>

            {/* Client Selection - Only for masters */}
            {isMaster && clients && clients.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cliente
                </Label>
                <Select
                  value={selectedClientId || 'all'}
                  onValueChange={(value) => setSelectedClientId(value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Period Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Período
              </Label>
              <Select
                value={period}
                onValueChange={(value) => setPeriod(value as PeriodOption)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {period === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customDateRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                            {format(customDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                          </>
                        ) : (
                          format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione o período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange?.from}
                      selected={customDateRange}
                      onSelect={setCustomDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* UTM Filters - inline, no collapsible */}
            <div className="space-y-3 border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros por UTM
                </Label>
                {hasUtmFilter && (
                  <div className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">Ativo</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => { setUtmSource(''); setUtmMedium(''); setUtmCampaign(''); setUtmContent(''); }}
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <Select value={utmSource || 'all'} onValueChange={(v) => setUtmSource(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {allSources.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Medium</Label>
                  <Select value={utmMedium || 'all'} onValueChange={(v) => setUtmMedium(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {allMediums.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Campaign</Label>
                  <Select value={utmCampaign || 'all'} onValueChange={(v) => setUtmCampaign(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {allCampaigns.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Content</Label>
                  <Select value={utmContent || 'all'} onValueChange={(v) => setUtmContent(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {allContents.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Format, Sections, Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exportação</h3>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Formato</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as ExportFormat)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="format-excel" />
                  <Label htmlFor="format-excel" className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Excel
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="format-csv" />
                  <Label htmlFor="format-csv" className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <FileText className="h-4 w-4 text-blue-600" />
                    CSV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="format-pdf" />
                  <Label htmlFor="format-pdf" className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <FileDown className="h-4 w-4 text-red-600" />
                    PDF
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Section Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Seções a incluir</Label>
              <div className="grid grid-cols-1 gap-2">
                {exportFormat === 'excel' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="summary" checked={options.includeSummary} onCheckedChange={() => toggleOption('includeSummary')} />
                    <Label htmlFor="summary" className="cursor-pointer text-sm">Resumo de KPIs</Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox id="hotmart" checked={options.includeHotmart} onCheckedChange={() => toggleOption('includeHotmart')} />
                  <Label htmlFor="hotmart" className="cursor-pointer text-sm">Transações Hotmart</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="tmb" checked={options.includeTmb} onCheckedChange={() => toggleOption('includeTmb')} />
                  <Label htmlFor="tmb" className="cursor-pointer text-sm">Transações TMB</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="eduzz" checked={options.includeEduzz} onCheckedChange={() => toggleOption('includeEduzz')} />
                  <Label htmlFor="eduzz" className="cursor-pointer text-sm">Transações Eduzz</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="combined" checked={options.includeCombined} onCheckedChange={() => toggleOption('includeCombined')} />
                  <Label htmlFor="combined" className="cursor-pointer text-sm">Transações Consolidadas</Label>
                </div>
              </div>
            </div>

            {/* Preview Info */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
              <p className="font-medium mb-1.5">Resumo da exportação:</p>
              {selectedClient && (
                <p>📋 Cliente: <span className="font-medium">{selectedClient.name}</span></p>
              )}
              <p>📅 Período: <span className="font-medium">{formatPeriodDisplay()}</span></p>
              {hasUtmFilter && (
                <p>🔍 UTM: <span className="font-medium">
                  {[utmSource && `source=${utmSource}`, utmMedium && `medium=${utmMedium}`, utmCampaign && `campaign=${utmCampaign}`, utmContent && `content=${utmContent}`].filter(Boolean).join(', ')}
                </span></p>
              )}
              <p>📊 Transações: <span className="font-medium">{isLoading ? '...' : transactionCount}</span></p>
              <p>📁 Formato: <span className="font-medium">{exportFormat.toUpperCase()}</span></p>
            </div>
          </div>
        </div>

        {/* Full-width export button */}
        <Button
          onClick={handleExport}
          disabled={isLoading || isExporting || !hasAnySelected || (period === 'custom' && !customDateRange?.from)}
          className="w-full"
        >
          {isExporting || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isLoading ? 'Carregando dados...' : 'Exportando...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Baixar Relatório {exportFormat === 'excel' ? 'Excel' : exportFormat === 'pdf' ? 'PDF' : 'CSV'}
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
