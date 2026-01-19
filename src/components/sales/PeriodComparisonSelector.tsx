import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format, subDays, subMonths, subYears, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ComparisonType = 'previous-period' | 'previous-year' | 'custom';

interface PeriodComparisonSelectorProps {
  currentDateRange: { from: Date; to: Date } | undefined;
  comparisonType: ComparisonType;
  onComparisonTypeChange: (type: ComparisonType) => void;
  customComparisonRange?: DateRange;
  onCustomComparisonRangeChange?: (range: DateRange | undefined) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

export function PeriodComparisonSelector({
  currentDateRange,
  comparisonType,
  onComparisonTypeChange,
  customComparisonRange,
  onCustomComparisonRangeChange,
  isEnabled,
  onToggle,
}: PeriodComparisonSelectorProps) {
  const [customCalendarOpen, setCustomCalendarOpen] = useState(false);

  // Calculate comparison period based on current period
  const getComparisonPeriodLabel = (): string => {
    if (!currentDateRange || !isEnabled) return '';
    
    if (comparisonType === 'custom' && customComparisonRange?.from && customComparisonRange?.to) {
      return `${format(customComparisonRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(customComparisonRange.to, 'dd/MM/yy', { locale: ptBR })}`;
    }

    const daysDiff = differenceInDays(currentDateRange.to, currentDateRange.from) + 1;

    if (comparisonType === 'previous-period') {
      const prevEnd = subDays(currentDateRange.from, 1);
      const prevStart = subDays(prevEnd, daysDiff - 1);
      return `${format(prevStart, 'dd/MM/yy', { locale: ptBR })} - ${format(prevEnd, 'dd/MM/yy', { locale: ptBR })}`;
    }

    if (comparisonType === 'previous-year') {
      const prevStart = subYears(currentDateRange.from, 1);
      const prevEnd = subYears(currentDateRange.to, 1);
      return `${format(prevStart, 'dd/MM/yy', { locale: ptBR })} - ${format(prevEnd, 'dd/MM/yy', { locale: ptBR })}`;
    }

    return '';
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isEnabled && (
        <>
          <Select value={comparisonType} onValueChange={(v) => onComparisonTypeChange(v as ComparisonType)}>
            <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs">
              <SelectValue placeholder="Período de comparação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous-period">Período anterior</SelectItem>
              <SelectItem value="previous-year">Mesmo período ano anterior</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {comparisonType === 'custom' && onCustomComparisonRangeChange && (
            <Popover open={customCalendarOpen} onOpenChange={setCustomCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {customComparisonRange?.from && customComparisonRange?.to ? (
                    <span>
                      {format(customComparisonRange.from, 'dd/MM', { locale: ptBR })} - {format(customComparisonRange.to, 'dd/MM', { locale: ptBR })}
                    </span>
                  ) : (
                    <span>Selecionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customComparisonRange}
                  onSelect={(range) => {
                    onCustomComparisonRangeChange(range);
                    if (range?.from && range?.to) {
                      setCustomCalendarOpen(false);
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <Badge variant="outline" className="text-xs font-normal">
            Comparando: {getComparisonPeriodLabel()}
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggle}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}

// Helper to calculate comparison date range
export function getComparisonDateRange(
  currentRange: { from: Date; to: Date } | undefined,
  comparisonType: ComparisonType,
  customRange?: DateRange
): { startDate: Date; endDate: Date } | undefined {
  if (!currentRange) return undefined;

  if (comparisonType === 'custom' && customRange?.from && customRange?.to) {
    return { startDate: customRange.from, endDate: customRange.to };
  }

  const daysDiff = differenceInDays(currentRange.to, currentRange.from) + 1;

  if (comparisonType === 'previous-period') {
    const prevEnd = subDays(currentRange.from, 1);
    const prevStart = subDays(prevEnd, daysDiff - 1);
    return { startDate: prevStart, endDate: prevEnd };
  }

  if (comparisonType === 'previous-year') {
    const prevStart = subYears(currentRange.from, 1);
    const prevEnd = subYears(currentRange.to, 1);
    return { startDate: prevStart, endDate: prevEnd };
  }

  return undefined;
}
