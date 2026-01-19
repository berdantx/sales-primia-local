import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Hash, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type SalesValueMode = 'count' | 'value';

interface SalesByDayChartProps {
  data: Record<string, { count: number; value: number }>;
  isLoading?: boolean;
  embedded?: boolean;
  valueMode?: SalesValueMode;
  onValueModeChange?: (mode: SalesValueMode) => void;
  currency?: string;
}

const formatCurrency = (value: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SalesByDayChart({ 
  data, 
  isLoading, 
  embedded = false,
  valueMode = 'count',
  onValueModeChange,
  currency = 'BRL',
}: SalesByDayChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data)
      .map(([date, values]) => ({
        date,
        count: values.count,
        value: values.value,
        displayDate: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const dataKey = valueMode === 'count' ? 'count' : 'value';

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
                <div className="bg-popover border rounded-lg shadow-lg p-3">
                  <p className="text-sm font-medium">
                    {format(parseISO(item.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.count} venda{item.count !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    {formatCurrency(item.value, currency)}
                  </p>
                </div>
              );
            }}
          />
          <Bar 
            dataKey={dataKey} 
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
        {valueToggle && (
          <div className="flex justify-end">
            {valueToggle}
          </div>
        )}
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
        {valueToggle}
      </CardHeader>
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}
