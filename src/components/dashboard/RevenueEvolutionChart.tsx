import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  ComposedChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { TrendingUp, BarChart3, AreaChartIcon, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChartType = 'area' | 'bar' | 'composed';

interface RevenueEvolutionChartProps {
  salesByDate: Record<string, Record<string, number>>;
  dollarRate?: number;
}

const chartOptions: { value: ChartType; label: string; icon: React.ElementType }[] = [
  { value: 'area', label: 'Área', icon: AreaChartIcon },
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'composed', label: 'Combinado', icon: LineChart },
];

export function RevenueEvolutionChart({ salesByDate, dollarRate }: RevenueEvolutionChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');

  const chartData = useMemo(() => {
    const rate = dollarRate || 5.5;
    const sorted = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30);

    let cumulative = 0;
    return sorted.map(([date, currencies]) => {
      const brl = currencies.BRL || 0;
      const usd = (currencies.USD || 0) * rate;
      const daily = brl + usd;
      cumulative += daily;

      return {
        date,
        daily,
        cumulative,
        label: format(parseISO(date), "dd MMM", { locale: ptBR }),
      };
    });
  }, [salesByDate, dollarRate]);

  if (chartData.length === 0) return null;

  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="text-muted-foreground text-xs mb-1">{data.label}</p>
        <p className="font-semibold">{formatCurrency(data.cumulative, 'BRL')}</p>
        <p className="text-xs text-muted-foreground">Dia: {formatCurrency(data.daily, 'BRL')}</p>
      </div>
    );
  };

  const sharedAxisProps = {
    xAxis: {
      dataKey: 'label' as const,
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
      interval: 'preserveStartEnd' as const,
    },
    yAxis: {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
      tickFormatter: (v: number) => `${(v / 1000).toFixed(0)}k`,
      width: 45,
    },
    grid: {
      strokeDasharray: '3 3',
      stroke: 'hsl(var(--border))',
      vertical: false,
    },
  };

  const renderChart = () => {
    const margin = { top: 10, right: 20, left: 10, bottom: 0 };

    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid {...sharedAxisProps.grid} />
          <XAxis {...sharedAxisProps.xAxis} />
          <YAxis {...sharedAxisProps.yAxis} yAxisId="left" />
          <Tooltip content={tooltipContent} />
          <Bar
            dataKey="daily"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            yAxisId="left"
            opacity={0.85}
          />
        </BarChart>
      );
    }

    if (chartType === 'composed') {
      return (
        <ComposedChart data={chartData} margin={margin}>
          <CartesianGrid {...sharedAxisProps.grid} />
          <XAxis {...sharedAxisProps.xAxis} />
          <YAxis {...sharedAxisProps.yAxis} yAxisId="left" />
          <YAxis {...sharedAxisProps.yAxis} yAxisId="right" orientation="right" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={tooltipContent} />
          <Bar
            dataKey="daily"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            yAxisId="left"
            opacity={0.5}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={(props: any) => {
              if (props.index === chartData.length - 1) {
                return <circle cx={props.cx} cy={props.cy} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />;
              }
              return <circle cx={props.cx} cy={props.cy} r={0} />;
            }}
            yAxisId="right"
          />
        </ComposedChart>
      );
    }

    // Default: area
    return (
      <AreaChart data={chartData} margin={margin}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...sharedAxisProps.grid} />
        <XAxis {...sharedAxisProps.xAxis} />
        <YAxis {...sharedAxisProps.yAxis} />
        <Tooltip content={tooltipContent} />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#colorRevenue)"
          dot={(props: any) => {
            if (props.index === chartData.length - 1) {
              return <circle cx={props.cx} cy={props.cy} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />;
            }
            return <circle cx={props.cx} cy={props.cy} r={0} />;
          }}
        />
      </AreaChart>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="p-5 sm:p-6 pb-2 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-foreground">Evolução de Receita</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {chartType === 'bar' ? 'Receita diária nos últimos 30 dias' : 'Confirmada acumulada nos últimos 30 dias'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden sm:block">Foco: Caixa Confirmado</span>
          {/* Chart type toggle */}
          <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
            {chartOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setChartType(opt.value)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                    chartType === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={opt.label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={260}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
