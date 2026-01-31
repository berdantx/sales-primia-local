import { useState, useMemo } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, FileSpreadsheet } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { useExportJobs } from '@/hooks/useExportJobs';
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

interface ExportLeadsDialogProps {
  trigger?: React.ReactNode;
}

export function ExportLeadsDialog({ trigger }: ExportLeadsDialogProps) {
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
  const { startExport, pendingCount } = useExportJobs();

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
      // Default custom range to last 30 days
      setCustomDateRange({
        from: subDays(new Date(), 30),
        to: new Date(),
      });
    }
  };

  const handleExport = async () => {
    try {
      await startExport.mutateAsync({
        clientId: clientId || undefined,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
        excludeTests,
      });

      toast.success('Exportação iniciada!', {
        description: 'Você será notificado quando o arquivo estiver pronto.',
        duration: 5000,
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Erro ao iniciar exportação', {
        description: error?.message || 'Tente novamente.',
      });
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
  };

  const handleCalendarApply = () => {
    setIsCalendarOpen(false);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Leads
          </DialogTitle>
          <DialogDescription>
            Configure o período e opções de exportação para gerar o arquivo CSV.
          </DialogDescription>
        </DialogHeader>

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
                    onSelect={handleCalendarSelect}
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
                      onClick={handleCalendarApply}
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
              id="exclude-tests"
              checked={excludeTests}
              onCheckedChange={(checked) => setExcludeTests(checked === true)}
            />
            <Label
              htmlFor="exclude-tests"
              className="text-sm font-normal cursor-pointer"
            >
              Excluir leads de teste (com tag [TESTE])
            </Label>
          </div>

          {/* Large export warning */}
          {period === 'all' && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-3">
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Exportações de grandes volumes podem demorar alguns minutos. 
                Você receberá uma notificação quando o arquivo estiver pronto.
              </p>
            </div>
          )}

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

          {/* Pending exports warning */}
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              ⚠️ Você tem {pendingCount} exportação(ões) em andamento.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={startExport.isPending}
          >
            {startExport.isPending ? (
              <>Iniciando...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar Leads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
