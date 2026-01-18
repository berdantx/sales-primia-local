import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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

interface LeadsPeriodFilterProps {
  selectedPeriod: string;
  dateRange: DateRange | undefined;
  onPeriodChange: (period: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const periodOptions = [
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '60days', label: 'Últimos 60 dias' },
  { value: 'all', label: 'Todo período' },
  { value: 'custom', label: 'Personalizado' },
];

export function LeadsPeriodFilter({
  selectedPeriod,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
  className,
}: LeadsPeriodFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

  // Sync temp state when calendar opens
  useEffect(() => {
    if (isCalendarOpen) {
      setTempDateRange(dateRange);
    }
  }, [isCalendarOpen, dateRange]);

  const handlePeriodChange = (value: string) => {
    onPeriodChange(value);
    
    const now = new Date();
    
    switch (value) {
      case '7days':
        onDateRangeChange({ from: subDays(now, 7), to: now });
        break;
      case '30days':
        onDateRangeChange({ from: subDays(now, 30), to: now });
        break;
      case '60days':
        onDateRangeChange({ from: subDays(now, 60), to: now });
        break;
      case 'all':
        onDateRangeChange(undefined);
        break;
      case 'custom':
        setIsCalendarOpen(true);
        break;
    }
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setTempDateRange(range);
  };

  const handleApply = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      onDateRangeChange(tempDateRange);
      setIsCalendarOpen(false);
    }
  };

  const handleCancel = () => {
    setTempDateRange(dateRange);
    setIsCalendarOpen(false);
  };

  const getDisplayLabel = () => {
    if (selectedPeriod === 'custom' && dateRange?.from) {
      const fromStr = format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR });
      const toStr = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : '';
      return toStr ? `${fromStr} - ${toStr}` : fromStr;
    }
    return periodOptions.find(p => p.value === selectedPeriod)?.label || 'Selecionar período';
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue>{getDisplayLabel()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPeriod === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          } else {
            setIsCalendarOpen(true);
          }
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={tempDateRange?.from || dateRange?.from}
              selected={tempDateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
            <div className="flex justify-end gap-2 p-3 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                disabled={!tempDateRange?.from || !tempDateRange?.to}
                onClick={handleApply}
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
