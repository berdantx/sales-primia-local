import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Hash, DollarSign, GitCompare, Calendar as CalendarIcon, X } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';

export type SalesValueMode = 'count' | 'value';

interface SalesComparisonChartProps {
  currentData: Record<string, { count: number; value: number }>;
  previousData?: Record<string, { count: number; value: number }>;
  isLoading?: boolean;
  embedded?: boolean;
  valueMode?: SalesValueMode;
  onValueModeChange?: (mode: SalesValueMode) => void;
  currency?: string;
  // Comparison config
  showComparison?: boolean;
  onComparisonToggle?: () => void;
  comparisonLabel?: string;
  currentLabel?: string;
}

const formatCurrency = (value: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SalesComparisonChart({ 
  currentData, 
  previousData,
  isLoading, 
  embedded = false,
  valueMode = 'count',
  onValueModeChange,
  currency = 'BRL',
  showComparison = false,
  onComparisonToggle,
  comparisonLabel = 'Anterior',
  currentLabel = 'Atual',
}: SalesComparisonChartProps) {
  // Merge current and previous data for comparison
  const chartData = useMemo(() => {
    if (!currentData) return [];
    
    const currentEntries = Object.entries(currentData)
      .map(([date, values]) => ({
        date,
        currentCount: values.count,
        currentValue: values.value,
        displayDate: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!showComparison || !previousData) {
      return currentEntries.map(e => ({
        ...e,
        previousCount: 0,
        previousValue: 0,
      }));
    }

    // Map previous data by relative position (day index)
    const previousEntries = Object.entries(previousData)
      .map(([date, values]) => ({
        date,
        count: values.count,
        value: values.value,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Align by index
    return currentEntries.map((entry, index) => ({
      ...entry,
      previousCount: previousEntries[index]?.count || 0,
      previousValue: previousEntries[index]?.value || 0,
    }));
  }, [currentData, previousData, showComparison]);

  const dataKeys = useMemo(() => {
    const prefix = valueMode === 'count' ? '' : '';
    return {
      current: valueMode === 'count' ? 'currentCount' : 'currentValue',
      previous: valueMode === 'count' ? 'previousCount' : 'previousValue',
    };
  }, [valueMode]);

  const valueToggle = onValueModeChange && (
    <ToggleGroup 
      type="single" 
      value={valueMode} 
      onValueChange={(v) => v && onValueModeChange(v as SalesValueMode)}
      size="sm"
    >
      <ToggleGroupItem value="count" aria-label="Ver quantidade" className="h-7 px-2">
        <Hash className="h-3 w-3" />
        <span className="hidden sm:inline ml-1 text-xs">Qtd</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="value" aria-label="Ver valor" className="h-7 px-2">
        <DollarSign className="h-3 w-3" />
        <span className="hidden sm:inline ml-1 text-xs">Valor</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );

  const comparisonToggle = onComparisonToggle && (
    <Button
      variant={showComparison ? "secondary" : "outline"}
      size="sm"
      onClick={onComparisonToggle}
      className="h-7 px-2 text-xs gap-1"
    >
      <GitCompare className="h-3 w-3" />
      <span className="hidden sm:inline">Comparar</span>
    </Button>
  );

  const chartContent = (
    <div className={embedded ? "h-[280px]" : "h-[200px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="displayDate" 
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickFormatter={(value) => 
              valueMode === 'value' 
                ? value >= 1000 
                  ? `${(value / 1000).toFixed(0)}k` 
                  : value.toString()
                : value.toString()
            }
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-3 space-y-1">
                  <p className="text-sm font-medium">
                    {format(parseISO(item.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="space-y-0.5">
                    <p className="text-sm text-primary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {currentLabel}: {item.currentCount} vendas ({formatCurrency(item.currentValue, currency)})
                    </p>
                    {showComparison && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        {comparisonLabel}: {item.previousCount} vendas ({formatCurrency(item.previousValue, currency)})
                      </p>
                    )}
                  </div>
                </div>
              );
            }}
          />
          {showComparison && (
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => value === dataKeys.current ? currentLabel : comparisonLabel}
            />
          )}
          {showComparison && (
            <Bar 
              dataKey={dataKeys.previous} 
              name={comparisonLabel}
              fill="hsl(var(--muted-foreground) / 0.4)" 
              radius={[4, 4, 0, 0]}
            />
          )}
          <Bar 
            dataKey={dataKeys.current} 
            name={currentLabel}
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (embedded) {
    if (isLoading) {
      return (
        <div className="h-[280px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      );
    }
    if (chartData.length === 0) {
      return (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Nenhum dado disponível
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end gap-2">
          {comparisonToggle}
          {valueToggle}
        </div>
        {chartContent}
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Vendas por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Vendas por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Vendas por Dia</CardTitle>
        <div className="flex items-center gap-2">
          {comparisonToggle}
          {valueToggle}
        </div>
      </CardHeader>
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}
