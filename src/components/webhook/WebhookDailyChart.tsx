import { useMemo } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface WebhookDailyChartProps {
  logs: WebhookLog[] | undefined;
  isLoading: boolean;
}

interface DailyData {
  date: string;
  dateLabel: string;
  processed: number;
  duplicate: number;
  skipped: number;
  error: number;
}

export function WebhookDailyChart({ logs, isLoading }: WebhookDailyChartProps) {
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Group logs by day
    const dailyMap = new Map<string, DailyData>();

    logs.forEach((log) => {
      const date = format(startOfDay(parseISO(log.created_at)), 'yyyy-MM-dd');
      const existing = dailyMap.get(date) || {
        date,
        dateLabel: format(parseISO(log.created_at), 'dd/MM', { locale: ptBR }),
        processed: 0,
        duplicate: 0,
        skipped: 0,
        error: 0,
      };

      if (log.status === 'processed') existing.processed++;
      else if (log.status === 'duplicate') existing.duplicate++;
      else if (log.status === 'skipped') existing.skipped++;
      else if (log.status === 'error') existing.error++;

      dailyMap.set(date, existing);
    });

    // Sort by date ascending
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para exibir o gráfico
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução Diária - Processados vs Duplicatas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDuplicate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    processed: 'Processados',
                    duplicate: 'Duplicatas',
                    error: 'Erros',
                    skipped: 'Ignorados',
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend 
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    processed: 'Processados',
                    duplicate: 'Duplicatas',
                    error: 'Erros',
                  };
                  return labels[value] || value;
                }}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="processed"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorProcessed)"
              />
              <Area
                type="monotone"
                dataKey="duplicate"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#colorDuplicate)"
              />
              <Area
                type="monotone"
                dataKey="error"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorError)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
