import { useMemo } from 'react';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface ValidationTrendChartProps {
  logs: WebhookLog[] | undefined;
  isLoading: boolean;
}

interface DailyAlertData {
  date: string;
  dateLabel: string;
  alerts: number;
  highDiscrepancy: number;
  criticalErrors: number;
}

export function ValidationTrendChart({ logs, isLoading }: ValidationTrendChartProps) {
  const { chartData, trend, stats } = useMemo(() => {
    if (!logs || logs.length === 0) {
      return { chartData: [], trend: 'stable' as const, stats: { total: 0, avg: 0 } };
    }

    // Filter validation alerts
    const validationLogs = logs.filter(
      (log) => log.status === 'warning' || log.event_type.includes('VALIDATION')
    );

    // Create a map for last 30 days
    const dailyMap = new Map<string, DailyAlertData>();
    const today = new Date();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      dailyMap.set(date, {
        date,
        dateLabel: format(subDays(today, i), 'dd/MM', { locale: ptBR }),
        alerts: 0,
        highDiscrepancy: 0,
        criticalErrors: 0,
      });
    }

    // Populate with actual data
    validationLogs.forEach((log) => {
      const date = format(startOfDay(parseISO(log.created_at)), 'yyyy-MM-dd');
      const existing = dailyMap.get(date);
      
      if (existing) {
        existing.alerts++;
        
        // Check for specific alert types
        const payload = log.payload as { _validation?: { errors?: string[]; warnings?: string[] } } | null;
        const validation = payload?._validation;
        
        if (validation?.errors?.some(e => e.includes('CRÍTICO') || e.includes('extrema'))) {
          existing.criticalErrors++;
        }
        if (validation?.warnings?.some(w => w.includes('Discrepância alta'))) {
          existing.highDiscrepancy++;
        }
      }
    });

    const data = Array.from(dailyMap.values());
    
    // Calculate trend (compare last 7 days vs previous 7 days)
    const last7Days = data.slice(-7).reduce((sum, d) => sum + d.alerts, 0);
    const prev7Days = data.slice(-14, -7).reduce((sum, d) => sum + d.alerts, 0);
    
    let trendValue: 'up' | 'down' | 'stable' = 'stable';
    if (last7Days > prev7Days * 1.2) trendValue = 'up';
    else if (last7Days < prev7Days * 0.8) trendValue = 'down';

    const totalAlerts = data.reduce((sum, d) => sum + d.alerts, 0);
    const avgAlerts = totalAlerts / 30;

    return {
      chartData: data,
      trend: trendValue,
      stats: {
        total: totalAlerts,
        avg: avgAlerts,
      },
    };
  }, [logs]);

  if (isLoading) {
    return (
      <Card className="border-amber-500/20">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-muted-foreground';
  const trendBg = trend === 'up' ? 'bg-red-500/10' : trend === 'down' ? 'bg-green-500/10' : 'bg-muted';
  const trendLabel = trend === 'up' ? 'Aumentando' : trend === 'down' ? 'Diminuindo' : 'Estável';

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Tendência de Alertas</CardTitle>
          </div>
          <Badge variant="secondary" className={`${trendBg} ${trendColor} flex items-center gap-1`}>
            <TrendIcon className="h-3 w-3" />
            {trendLabel}
          </Badge>
        </div>
        <CardDescription>
          Evolução dos alertas de validação nos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-amber-600">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total (30 dias)</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{stats.avg.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Média/dia</p>
          </div>
        </div>

        {chartData.length === 0 || stats.total === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Nenhum alerta de validação nos últimos 30 dias</p>
            </div>
          </div>
        ) : (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={30}
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
                      alerts: 'Alertas',
                      highDiscrepancy: 'Discrepância alta',
                      criticalErrors: 'Erros críticos',
                    };
                    return [value, labels[name] || name];
                  }}
                />
                <ReferenceLine
                  y={stats.avg}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Média',
                    position: 'right',
                    fontSize: 10,
                    fill: '#f59e0b',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="alerts"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="criticalErrors"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 2 }}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
