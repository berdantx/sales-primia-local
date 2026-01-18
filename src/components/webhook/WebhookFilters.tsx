import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
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
import type { WebhookLogsFilters } from '@/hooks/useWebhookLogs';
import { useIsMobile } from '@/hooks/use-mobile';

interface WebhookFiltersProps {
  filters: WebhookLogsFilters;
  onFiltersChange: (filters: WebhookLogsFilters) => void;
}

const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'all', label: 'Todo período' },
  { value: 'custom', label: 'Personalizado' },
];

export function WebhookFilters({ filters, onFiltersChange }: WebhookFiltersProps) {
  const isMobile = useIsMobile();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [period, setPeriod] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const handleStatusChange = (status: string) => {
    onFiltersChange({ ...filters, status });
  };

  const handlePlatformChange = (platform: string) => {
    onFiltersChange({ ...filters, platform });
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const now = new Date();

    if (value === 'today') {
      onFiltersChange({
        ...filters,
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      });
    } else if (value === '7days') {
      onFiltersChange({
        ...filters,
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now),
      });
    } else if (value === '30days') {
      onFiltersChange({
        ...filters,
        startDate: startOfDay(subDays(now, 30)),
        endDate: endOfDay(now),
      });
    } else if (value === 'all') {
      onFiltersChange({
        ...filters,
        startDate: undefined,
        endDate: undefined,
      });
    } else if (value === 'custom') {
      setShowCalendar(true);
    }
  };

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchValue || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    if (range.from && range.to) {
      onFiltersChange({
        ...filters,
        startDate: startOfDay(range.from),
        endDate: endOfDay(range.to),
      });
      setShowCalendar(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex gap-2 w-full sm:w-auto flex-wrap">
        <Select value={filters.platform || 'all'} onValueChange={handlePlatformChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="hotmart">Hotmart</SelectItem>
            <SelectItem value="tmb">TMB</SelectItem>
            <SelectItem value="eduzz">Eduzz</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="processed">Processados</SelectItem>
            <SelectItem value="skipped">Ignorados</SelectItem>
            <SelectItem value="error">Erros</SelectItem>
            <SelectItem value="duplicate">Duplicatas</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <div className="flex-1 sm:flex-none">
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange as { from: Date; to: Date }}
              onSelect={(range) => handleDateRangeSelect(range || {})}
              locale={ptBR}
              numberOfMonths={isMobile ? 1 : 2}
              className="pointer-events-auto"
            />
            {dateRange.from && dateRange.to && (
              <div className="p-3 border-t text-sm text-muted-foreground">
                {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2 flex-1 min-w-0">
        <Input
          placeholder="Buscar código..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm"
        />
        <Button variant="secondary" onClick={handleSearch} size="icon" className="shrink-0">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
