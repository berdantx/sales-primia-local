import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, CalendarIcon } from 'lucide-react';
import { AccessLogsFilters as FiltersType } from '@/hooks/useAccessLogs';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface AccessLogsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
}

const eventTypes = [
  { value: 'all', label: 'Todos os eventos' },
  { value: 'login_success', label: 'Login (sucesso)' },
  { value: 'login_failed', label: 'Login (falhou)' },
  { value: 'logout', label: 'Logout' },
  { value: 'password_changed', label: 'Senha alterada' },
  { value: 'session_revoked', label: 'Sessão revogada' },
];

const periodPresets = [
  { value: 'all', label: 'Todo período' },
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'custom', label: 'Personalizado' },
];

export function AccessLogsFilters({ filters, onFiltersChange }: AccessLogsFiltersProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleEmailChange = (value: string) => {
    onFiltersChange({ ...filters, email: value || undefined });
  };

  const handleEventTypeChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      eventType: value === 'all' ? undefined : value 
    });
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    switch (value) {
      case 'today':
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
        break;
      case '7days':
        startDate = startOfDay(subDays(new Date(), 7));
        endDate = endOfDay(new Date());
        break;
      case '30days':
        startDate = startOfDay(subDays(new Date(), 30));
        endDate = endOfDay(new Date());
        break;
      case 'custom':
        // Don't change dates, open calendar
        setCalendarOpen(true);
        return;
      default:
        startDate = undefined;
        endDate = undefined;
    }
    
    onFiltersChange({ ...filters, startDate, endDate });
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      onFiltersChange({
        ...filters,
        startDate: startOfDay(range.from),
        endDate: range.to ? endOfDay(range.to) : endOfDay(range.from),
      });
    }
  };

  const clearFilters = () => {
    setSelectedPeriod('all');
    setDateRange(undefined);
    onFiltersChange({});
  };

  const hasActiveFilters = filters.email || filters.eventType || filters.startDate;

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Email search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email..."
            value={filters.email || ''}
            onChange={(e) => handleEmailChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Event type filter */}
        <Select
          value={filters.eventType || 'all'}
          onValueChange={handleEventTypeChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Period filter */}
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {periodPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom date range picker */}
        {selectedPeriod === 'custom' && (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-full sm:w-auto",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  "Selecionar datas"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
