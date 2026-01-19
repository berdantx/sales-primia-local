import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, Calendar, CalendarDays, Hash, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useSalesTrend, SalesGroupBy, SalesTrendDataPoint } from '@/hooks/useSalesTrend';
import { SalesViewMode } from '@/hooks/useTopSales';

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
];

interface SalesTrendChartProps<T> {
  transactions: T[] | undefined;
  topItemNames: string[];
  mode: SalesViewMode;
  groupBy: SalesGroupBy;
  onGroupByChange: (value: SalesGroupBy) => void;
  isLoading?: boolean;
  embedded?: boolean;
  // Field mappings
  dateField?: keyof T;
  productField?: keyof T;
  campaignField?: keyof T;
  originField?: keyof T;
  valueField?: keyof T;
  valueMode?: 'count' | 'value';
  onValueModeChange?: (mode: 'count' | 'value') => void;
}

const truncateName = (name: string, maxLength: number = 20) => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
  valueMode?: 'count' | 'value';
}

const CustomTooltip = ({ active, payload, label, valueMode = 'count' }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3">
      <p className="font-medium text-sm mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground truncate max-w-[150px]">
              {entry.name}:
            </span>
            <span className="font-medium">
              {valueMode === 'value' ? formatCurrency(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function SalesTrendChart<T>({
  transactions,
  topItemNames,
  mode,
  groupBy,
  onGroupByChange,
  isLoading,
  embedded = false,
  dateField = 'purchase_date' as keyof T,
  productField = 'product' as keyof T,
  campaignField = 'utm_campaign' as keyof T,
  originField = 'sck_code' as keyof T,
  valueField = 'computed_value' as keyof T,
  valueMode = 'count',
  onValueModeChange,
}: SalesTrendChartProps<T>) {
  const { trendData } = useSalesTrend({
    transactions,
    topItemNames,
    mode,
    groupBy,
    dateField,
    productField,
    campaignField,
    originField,
    valueField,
    valueMode,
  });

  const title = mode === 'products' 
    ? 'Evolução dos Produtos' 
    : mode === 'campaigns'
      ? 'Evolução das Campanhas'
      : 'Evolução das Origens';

  const chartContent = (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trendData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="displayDate" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            className="text-muted-foreground"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            tickFormatter={(value) => 
              valueMode === 'value' 
                ? value >= 1000 
                  ? `${(value / 1000).toFixed(0)}k` 
                  : value.toString()
                : value.toString()
            }
          />
          <Tooltip content={<CustomTooltip valueMode={valueMode} />} />
          <Legend 
            formatter={(value) => truncateName(value, 25)}
            wrapperStyle={{ fontSize: '12px' }}
          />
          {topItemNames.map((name, index) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              name={name}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const groupByToggle = (
    <ToggleGroup 
      type="single" 
      value={groupBy} 
      onValueChange={(value) => value && onGroupByChange(value as SalesGroupBy)}
      size="sm"
    >
      <ToggleGroupItem value="day" aria-label="Agrupar por dia" className="h-7 px-2">
        <Calendar className="h-3 w-3" />
        <span className="hidden sm:inline ml-1 text-xs">Dia</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="week" aria-label="Agrupar por semana" className="h-7 px-2">
        <CalendarDays className="h-3 w-3" />
        <span className="hidden sm:inline ml-1 text-xs">Semana</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );

  const valueToggle = onValueModeChange && (
    <ToggleGroup 
      type="single" 
      value={valueMode} 
      onValueChange={(v) => v && onValueModeChange(v as 'count' | 'value')}
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

  if (embedded) {
    if (isLoading) {
      return (
        <div className="h-[280px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando gráfico...</div>
        </div>
      );
    }
    if (trendData.length === 0) {
      return (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Sem dados para exibir no período selecionado
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="flex justify-end gap-2">
          {valueToggle}
          {groupByToggle}
        </div>
        {chartContent}
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando gráfico...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir no período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex gap-2">
            {valueToggle}
            {groupByToggle}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}
