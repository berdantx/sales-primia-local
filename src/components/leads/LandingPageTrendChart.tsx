import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingPageStats } from '@/hooks/useLandingPageStats';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface LandingPageTrendChartProps {
  stats: LandingPageStats[];
  dateRange?: DateRange;
  isLoading?: boolean;
  embedded?: boolean;
}

// Colors for different pages
const PAGE_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(280, 65%, 55%)',
  'hsl(30, 80%, 55%)',
];

export function LandingPageTrendChart({
  stats,
  dateRange,
  isLoading,
  embedded = false,
}: LandingPageTrendChartProps) {
  const chartData = useMemo(() => {
    if (!stats || stats.length === 0) return [];

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (dateRange?.from && dateRange?.to) {
      startDate = startOfDay(dateRange.from);
      endDate = endOfDay(dateRange.to);
    } else {
      // Find min/max dates from all pages
      const allDates = stats.flatMap((page) =>
        Object.keys(page.leadsByDay).map((d) => parseISO(d))
      );
      if (allDates.length === 0) return [];
      
      startDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
      endDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    }

    // Generate all days in range
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Build chart data
    return days.map((day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayLabel = format(day, 'dd/MM', { locale: ptBR });

      const dataPoint: Record<string, number | string> = {
        date: dayKey,
        label: dayLabel,
      };

      // Add count for each page
      stats.forEach((page) => {
        dataPoint[page.displayName] = page.leadsByDay[dayKey] || 0;
      });

      return dataPoint;
    });
  }, [stats, dateRange]);

  const content = (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Nenhum dado disponível para o período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                fontSize: 12,
              }}
              labelFormatter={(_, payload) => {
                if (payload?.[0]?.payload?.date) {
                  return format(parseISO(payload[0].payload.date), "dd 'de' MMMM", {
                    locale: ptBR,
                  });
                }
                return '';
              }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString('pt-BR')} leads`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => (
                <span className="text-foreground text-xs">{value}</span>
              )}
            />
            {stats.slice(0, 5).map((page, index) => (
              <Line
                key={page.normalizedUrl}
                type="monotone"
                dataKey={page.displayName}
                stroke={PAGE_COLORS[index % PAGE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </>
  );

  if (embedded) {
    return <div className="h-full">{content}</div>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Evolução de Landing Pages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        {content}
      </CardContent>
    </Card>
  );
}
