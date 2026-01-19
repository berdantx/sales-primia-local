import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

export type PeriodOption = 'today' | '7days' | '30days' | 'all' | 'custom';

interface PeriodSelectorProps {
  onPeriodChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  className?: string;
}

export function PeriodSelector({ onPeriodChange, className }: PeriodSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePeriodChange = (value: PeriodOption) => {
    setSelectedPeriod(value);
    
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = endOfDay(now);

    switch (value) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case '7days':
        startDate = startOfDay(subDays(now, 7));
        break;
      case '30days':
        startDate = startOfDay(subDays(now, 30));
        break;
      case 'all':
        startDate = undefined;
        endDate = undefined;
        break;
      case 'custom':
        setIsCalendarOpen(true);
        return;
    }

    onPeriodChange(startDate, endDate);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onPeriodChange(startOfDay(range.from), endOfDay(range.to));
      setIsCalendarOpen(false);
    }
  };

  const getPeriodLabel = () => {
    if (selectedPeriod === 'custom' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd/MM', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM', { locale: ptBR })}`;
    }
    return undefined;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Período">
            {getPeriodLabel() || (
              selectedPeriod === 'today' ? 'Hoje' :
              selectedPeriod === '7days' ? '7 dias' :
              selectedPeriod === '30days' ? '30 dias' :
              selectedPeriod === 'all' ? 'Todo período' :
              'Personalizado'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="7days">Últimos 7 dias</SelectItem>
          <SelectItem value="30days">Últimos 30 dias</SelectItem>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {selectedPeriod === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2">
              <CalendarIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
