import { useState, useMemo, useEffect } from 'react';
import { format, subDays, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Filter, Search } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useClientSideExport, AVAILABLE_FIELDS, ALL_FIELD_KEYS } from '@/hooks/useClientSideExport';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PeriodOption = 'all' | '1day' | '7days' | '30days' | '90days' | '1year' | 'custom';

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 'all', label: 'Todo o período' },
  { value: '1day', label: 'Último dia' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '90days', label: 'Últimos 90 dias' },
  { value: '1year', label: 'Último ano' },
  { value: 'custom', label: 'Personalizado' },
];

export interface ExportActiveFilters {
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  trafficType?: string;
  country?: string;
  pageUrl?: string;
  search?: string;
}

export interface ExportFilterOptions {
  sources?: string[];
  utmSources?: string[];
  utmMediums?: string[];
  utmCampaigns?: string[];
  utmContents?: string[];
  utmTerms?: string[];
  trafficTypes?: string[];
  countries?: string[];
  pages?: string[];
}

interface ClientSideExportDialogProps {
  trigger?: React.ReactNode;
  activeFilters?: ExportActiveFilters;
  filterOptions?: ExportFilterOptions;
}

export function ClientSideExportDialog({ trigger, activeFilters, filterOptions }: ClientSideExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodOption>('30days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30), to: new Date(),
  });
  const [excludeTests, setExcludeTests] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([...ALL_FIELD_KEYS]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced filter states
  const [source, setSource] = useState<string>('all');
  const [utmSource, setUtmSource] = useState<string>('all');
  const [utmMedium, setUtmMedium] = useState<string>('all');
  const [utmCampaign, setUtmCampaign] = useState<string>('all');
  const [utmContent, setUtmContent] = useState<string>('all');
  const [utmTerm, setUtmTerm] = useState<string>('all');
  const [trafficType, setTrafficType] = useState<string>('all');
  const [country, setCountry] = useState<string>('all');
  const [pageUrl, setPageUrl] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { clientId } = useFilter();
  const { data: clients } = useClients();
  const { progress, startExport, cancelExport, reset, isExporting } = useClientSideExport();

  useEffect(() => {
    if (open) {
      reset();
      setSelectedFields([...ALL_FIELD_KEYS]);
      // Reset advanced filters
      setSource('all');
      setUtmSource('all');
      setUtmMedium('all');
      setUtmCampaign('all');
      setUtmContent('all');
      setUtmTerm('all');
      setTrafficType('all');
      setCountry('all');
      setPageUrl('all');
      setSearchTerm('');
      setShowAdvanced(false);
    }
  }, [open, reset]);

  const applyPageFilters = () => {
    if (!activeFilters) return;
    if (activeFilters.source) setSource(activeFilters.source);
    if (activeFilters.utmSource) setUtmSource(activeFilters.utmSource);
    if (activeFilters.utmMedium) setUtmMedium(activeFilters.utmMedium);
    if (activeFilters.utmCampaign) setUtmCampaign(activeFilters.utmCampaign);
    if (activeFilters.utmContent) setUtmContent(activeFilters.utmContent);
    if (activeFilters.utmTerm) setUtmTerm(activeFilters.utmTerm);
    if (activeFilters.trafficType) setTrafficType(activeFilters.trafficType);
    if (activeFilters.country) setCountry(activeFilters.country);
    if (activeFilters.pageUrl) setPageUrl(activeFilters.pageUrl);
    if (activeFilters.search) setSearchTerm(activeFilters.search);
    setShowAdvanced(true);
  };

  const hasPageFilters = activeFilters && Object.values(activeFilters).some(v => v && v !== 'all');

  const selectedClientName = useMemo(() => {
    if (!clientId) return 'Todos os clientes';
    return clients?.find(c => c.id === clientId)?.name || 'Cliente selecionado';
  }, [clientId, clients]);

  const dateRange = useMemo((): DateRange | undefined => {
    const now = new Date();
    switch (period) {
      case 'all': return undefined;
      case '1day': return { from: subDays(now, 1), to: now };
      case '7days': return { from: subDays(now, 7), to: now };
      case '30days': return { from: subDays(now, 30), to: now };
      case '90days': return { from: subDays(now, 90), to: now };
      case '1year': return { from: subYears(now, 1), to: now };
      case 'custom': return customDateRange;
      default: return { from: subDays(now, 30), to: now };
    }
  }, [period, customDateRange]);

  const formattedDateRange = useMemo(() => {
    if (!dateRange?.from) return 'Todo o período';
    const fromStr = format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR });
    const toStr = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : '';
    return toStr ? `${fromStr} - ${toStr}` : fromStr;
  }, [dateRange]);

  const handlePeriodChange = (value: PeriodOption) => {
    setPeriod(value);
    if (value === 'custom' && !customDateRange?.from) {
      setCustomDateRange({ from: subDays(new Date(), 30), to: new Date() });
    }
  };

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const advancedFilterCount = [
    source !== 'all',
    utmSource !== 'all',
    utmMedium !== 'all',
    utmCampaign !== 'all',
    utmContent !== 'all',
    utmTerm !== 'all',
    trafficType !== 'all',
    country !== 'all',
    pageUrl !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length;

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Selecione pelo menos um campo para exportar');
      return;
    }
    const result = await startExport({
      clientId: clientId || undefined,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
      excludeTests,
      selectedFields,
      source: source !== 'all' ? source : undefined,
      utmSource: utmSource !== 'all' ? utmSource : undefined,
      utmMedium: utmMedium !== 'all' ? utmMedium : undefined,
      utmCampaign: utmCampaign !== 'all' ? utmCampaign : undefined,
      utmContent: utmContent !== 'all' ? utmContent : undefined,
      utmTerm: utmTerm !== 'all' ? utmTerm : undefined,
      trafficType: trafficType !== 'all' ? trafficType : undefined,
      country: country !== 'all' ? country : undefined,
      pageUrl: pageUrl !== 'all' ? pageUrl : undefined,
      search: searchTerm || undefined,
    });
    if (result) {
      toast.success('Exportação concluída!', {
        description: `${result.totalRecords.toLocaleString('pt-BR')} leads exportados para ${result.fileName}`,
        duration: 5000,
      });
    }
  };

  const handleClose = () => {
    if (isExporting) cancelExport();
    setOpen(false);
  };

  const getStatusMessage = () => {
    switch (progress.status) {
      case 'counting': return 'Contando leads...';
      case 'exporting': return `Exportando leads... ${progress.processed.toLocaleString('pt-BR')} de ${progress.total.toLocaleString('pt-BR')}`;
      case 'generating': return 'Gerando arquivo CSV...';
      case 'complete': return `${progress.processed.toLocaleString('pt-BR')} leads exportados com sucesso!`;
      case 'cancelled': return 'Exportação cancelada';
      case 'error': return progress.error || 'Erro durante a exportação';
      default: return '';
    }
  };

  const isProgressView = isExporting || progress.status === 'complete' || progress.status === 'error' || progress.status === 'cancelled';

  const renderFilterSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: string[] | undefined,
    placeholder?: string,
  ) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={placeholder || 'Todos'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {(options || []).map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh]" onPointerDownOutside={(e) => isExporting && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Leads
          </DialogTitle>
          <DialogDescription>
            A exportação é processada diretamente no seu navegador, sem limites de volume.
          </DialogDescription>
        </DialogHeader>

        {isProgressView ? (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center gap-4">
              {isExporting && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
              {progress.status === 'complete' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
              {(progress.status === 'error' || progress.status === 'cancelled') && <AlertCircle className="h-12 w-12 text-destructive" />}
              <p className="text-center font-medium">{getStatusMessage()}</p>
              {isExporting && (
                <div className="w-full space-y-2">
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">{progress.percentage}%</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              {isExporting ? (
                <Button variant="outline" onClick={cancelExport} className="w-full">
                  <X className="h-4 w-4 mr-2" />Cancelar
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => reset()} className="w-full sm:w-auto">Nova Exportação</Button>
                  <Button onClick={handleClose} className="w-full sm:w-auto">Fechar</Button>
                </>
              )}
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Period Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />Período
                </Label>
                <Select value={period} onValueChange={(v) => handlePeriodChange(v as PeriodOption)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {period === 'custom' && (
                <div className="space-y-2">
                  <Label>Intervalo personalizado</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !customDateRange?.from && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange?.from ? (
                          customDateRange.to
                            ? <>{format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}</>
                            : format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        ) : <span>Selecione as datas</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="range" defaultMonth={customDateRange?.from} selected={customDateRange} onSelect={setCustomDateRange} numberOfMonths={2} locale={ptBR} className="pointer-events-auto" />
                      <div className="flex justify-end gap-2 p-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => setIsCalendarOpen(false)}>Fechar</Button>
                        <Button size="sm" disabled={!customDateRange?.from || !customDateRange?.to} onClick={() => setIsCalendarOpen(false)}>Aplicar</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Advanced Filters Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-sm font-medium flex items-center gap-2 hover:bg-transparent"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Filter className="h-4 w-4" />
                    Filtros avançados
                    {advancedFilterCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {advancedFilterCount}
                      </span>
                    )}
                  </Button>
                  {hasPageFilters && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={applyPageFilters}>
                      Usar filtros da página
                    </Button>
                  )}
                </div>

                {showAdvanced && (
                  <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                    {/* Search */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Buscar por nome/email</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="nome ou email..."
                          className="h-8 text-xs pl-7"
                        />
                      </div>
                    </div>

                    {/* Traffic Type */}
                    {renderFilterSelect('Tipo de tráfego', trafficType, setTrafficType, filterOptions?.trafficTypes)}

                    {/* Source */}
                    {renderFilterSelect('Fonte', source, setSource, filterOptions?.sources)}

                    {/* UTMs in grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {renderFilterSelect('UTM Source', utmSource, setUtmSource, filterOptions?.utmSources)}
                      {renderFilterSelect('UTM Medium', utmMedium, setUtmMedium, filterOptions?.utmMediums)}
                      {renderFilterSelect('UTM Campaign', utmCampaign, setUtmCampaign, filterOptions?.utmCampaigns)}
                      {renderFilterSelect('UTM Content', utmContent, setUtmContent, filterOptions?.utmContents)}
                    </div>
                    {renderFilterSelect('UTM Term', utmTerm, setUtmTerm, filterOptions?.utmTerms)}

                    {/* Country & Page */}
                    <div className="grid grid-cols-2 gap-2">
                      {renderFilterSelect('País', country, setCountry, filterOptions?.countries)}
                      {renderFilterSelect('Página', pageUrl, setPageUrl, filterOptions?.pages)}
                    </div>
                  </div>
                )}
              </div>

              {/* Field Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Campos para exportar</Label>
                  <div className="flex gap-2">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedFields([...ALL_FIELD_KEYS])}>
                      Selecionar todos
                    </Button>
                    <span className="text-muted-foreground text-xs">|</span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedFields([])}>
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3">
                  {AVAILABLE_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field.key}`}
                        checked={selectedFields.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                      />
                      <Label htmlFor={`field-${field.key}`} className="text-sm font-normal cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exclude Tests */}
              <div className="flex items-center space-x-2">
                <Checkbox id="exclude-tests-client" checked={excludeTests} onCheckedChange={(c) => setExcludeTests(c === true)} />
                <Label htmlFor="exclude-tests-client" className="text-sm font-normal cursor-pointer">
                  Excluir leads de teste (com tag [TESTE])
                </Label>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50 p-3">
                <span className="text-blue-600 dark:text-blue-400">💡</span>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-medium">Exportação local</p>
                  <p>Os dados são processados diretamente no seu navegador. Mantenha esta janela aberta durante a exportação.</p>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">📊 Resumo da exportação:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Período:</span> <span className="font-medium">{formattedDateRange}</span></p>
                  <p><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{selectedClientName}</span></p>
                  <p><span className="text-muted-foreground">Campos:</span> <span className="font-medium">{selectedFields.length} de {ALL_FIELD_KEYS.length} selecionados</span></p>
                  {advancedFilterCount > 0 && (
                    <p><span className="text-muted-foreground">Filtros:</span> <span className="font-medium">{advancedFilterCount} filtro{advancedFilterCount > 1 ? 's' : ''} aplicado{advancedFilterCount > 1 ? 's' : ''}</span></p>
                  )}
                  {excludeTests && <p className="text-muted-foreground italic">Leads de teste serão excluídos</p>}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleExport} disabled={selectedFields.length === 0}>
                <Download className="h-4 w-4 mr-2" />Exportar Leads
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
