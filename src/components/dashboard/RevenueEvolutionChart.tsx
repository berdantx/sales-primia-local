import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { TrendingUp } from 'lucide-react';

interface RevenueEvolutionChartProps {
  salesByDate: Record<string, Record<string, number>>;
  dollarRate?: number;
}

export function RevenueEvolutionChart({ salesByDate, dollarRate }: RevenueEvolutionChartProps) {
  const chartData = useMemo(() => {
    const rate = dollarRate || 5.5;
    const sorted = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30); // Last 30 data points

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

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-foreground">Evolução de Receita</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Confirmada acumulada nos últimos 30 dias</p>
      </div>
      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
                    <p className="text-muted-foreground text-xs mb-1">{data.label}</p>
                    <p className="font-semibold">{formatCurrency(data.cumulative, 'BRL')}</p>
                    <p className="text-xs text-muted-foreground">Dia: {formatCurrency(data.daily, 'BRL')}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
