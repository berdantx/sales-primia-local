import { useState, useMemo, useEffect } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useClientSideExport } from '@/hooks/useClientSideExport';
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

interface ClientSideExportDialogProps {
  trigger?: React.ReactNode;
}

export function ClientSideExportDialog({ trigger }: ClientSideExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodOption>('30days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [excludeTests, setExcludeTests] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { clientId } = useFilter();
  const { data: clients } = useClients();
  const { progress, startExport, cancelExport, reset, isExporting } = useClientSideExport();

  // Reset progress when dialog opens
  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  // Get selected client name
  const selectedClientName = useMemo(() => {
    if (!clientId) return 'Todos os clientes';
    const client = clients?.find(c => c.id === clientId);
    return client?.name || 'Cliente selecionado';
  }, [clientId, clients]);

  // Calculate date range based on selected period
  const dateRange = useMemo((): DateRange | undefined => {
    const now = new Date();
    
    switch (period) {
      case 'all':
        return undefined;
      case '1day':
        return { from: subDays(now, 1), to: now };
      case '7days':
        return { from: subDays(now, 7), to: now };
      case '30days':
        return { from: subDays(now, 30), to: now };
      case '90days':
        return { from: subDays(now, 90), to: now };
      case '1year':
        return { from: subYears(now, 1), to: now };
      case 'custom':
        return customDateRange;
      default:
        return { from: subDays(now, 30), to: now };
    }
  }, [period, customDateRange]);

  // Format date range for display
  const formattedDateRange = useMemo(() => {
    if (!dateRange?.from) return 'Todo o período';
    
    const fromStr = format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR });
    const toStr = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : '';
    
    return toStr ? `${fromStr} - ${toStr}` : fromStr;
  }, [dateRange]);

  const handlePeriodChange = (value: PeriodOption) => {
    setPeriod(value);
    
    if (value === 'custom' && !customDateRange?.from) {
      setCustomDateRange({
        from: subDays(new Date(), 30),
        to: new Date(),
      });
    }
  };

  const handleExport = async () => {
    const result = await startExport({
      clientId: clientId || undefined,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
      excludeTests,
    });

    if (result) {
      toast.success('Exportação concluída!', {
        description: `${result.totalRecords.toLocaleString('pt-BR')} leads exportados para ${result.fileName}`,
        duration: 5000,
      });
    }
  };

  const handleClose = () => {
    if (isExporting) {
      cancelExport();
    }
    setOpen(false);
  };

  const getStatusMessage = () => {
    switch (progress.status) {
      case 'counting':
        return 'Contando leads...';
      case 'exporting':
        return `Exportando leads... ${progress.processed.toLocaleString('pt-BR')} de ${progress.total.toLocaleString('pt-BR')}`;
      case 'generating':
        return 'Gerando arquivo CSV...';
      case 'complete':
        return `${progress.processed.toLocaleString('pt-BR')} leads exportados com sucesso!`;
      case 'cancelled':
        return 'Exportação cancelada';
      case 'error':
        return progress.error || 'Erro durante a exportação';
      default:
        return '';
    }
  };

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
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => isExporting && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Leads
          </DialogTitle>
          <DialogDescription>
            A exportação é processada diretamente no seu navegador, sem limites de volume.
          </DialogDescription>
        </DialogHeader>

        {/* Export Progress View */}
        {(isExporting || progress.status === 'complete' || progress.status === 'error' || progress.status === 'cancelled') ? (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center gap-4">
              {isExporting && (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              )}
              {progress.status === 'complete' && (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              )}
              {(progress.status === 'error' || progress.status === 'cancelled') && (
                <AlertCircle className="h-12 w-12 text-destructive" />
              )}
              
              <p className="text-center font-medium">{getStatusMessage()}</p>
              
              {isExporting && (
                <div className="w-full space-y-2">
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {progress.percentage}%
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              {isExporting ? (
                <Button variant="outline" onClick={cancelExport} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => reset()} className="w-full sm:w-auto">
                    Nova Exportação
                  </Button>
                  <Button onClick={handleClose} className="w-full sm:w-auto">
                    Fechar
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        ) : (
          /* Configuration View */
          <>
            <div className="space-y-4 py-4">
              {/* Period Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Período
                </Label>
                <Select value={period} onValueChange={(v) => handlePeriodChange(v as PeriodOption)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range Picker */}
              {period === 'custom' && (
                <div className="space-y-2">
                  <Label>Intervalo personalizado</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange?.from ? (
                          customDateRange.to ? (
                            <>
                              {format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                              {format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                            </>
                          ) : (
                            format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                          )
                        ) : (
                          <span>Selecione as datas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={customDateRange?.from}
                        selected={customDateRange}
                        onSelect={setCustomDateRange}
                        numberOfMonths={2}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                      <div className="flex justify-end gap-2 p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCalendarOpen(false)}
                        >
                          Fechar
                        </Button>
                        <Button
                          size="sm"
                          disabled={!customDateRange?.from || !customDateRange?.to}
                          onClick={() => setIsCalendarOpen(false)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Exclude Tests Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-tests-client"
                  checked={excludeTests}
                  onCheckedChange={(checked) => setExcludeTests(checked === true)}
                />
                <Label
                  htmlFor="exclude-tests-client"
                  className="text-sm font-normal cursor-pointer"
                >
                  Excluir leads de teste (com tag [TESTE])
                </Label>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50 p-3">
                <span className="text-blue-600 dark:text-blue-400">💡</span>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-medium">Exportação local</p>
                  <p>
                    Os dados são processados diretamente no seu navegador. 
                    Mantenha esta janela aberta durante a exportação.
                  </p>
                </div>
              </div>

              {/* Summary Section */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">📊 Resumo da exportação:</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Período:</span>{' '}
                    <span className="font-medium">{formattedDateRange}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Cliente:</span>{' '}
                    <span className="font-medium">{selectedClientName}</span>
                  </p>
                  {excludeTests && (
                    <p className="text-muted-foreground italic">
                      Leads de teste serão excluídos
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Leads
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
