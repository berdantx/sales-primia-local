import { useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  Calendar,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface WeeklySummaryCardProps {
  logs: WebhookLog[] | undefined;
  isLoading: boolean;
}

interface WeekData {
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
  totalAlerts: number;
  criticalAlerts: number;
  highDiscrepancy: number;
  transactionsAffected: Set<string>;
}

export function WeeklySummaryCard({ logs, isLoading }: WeeklySummaryCardProps) {
  const { weeks, comparison, improvement } = useMemo(() => {
    if (!logs || logs.length === 0) {
      return { 
        weeks: [] as WeekData[], 
        comparison: { change: 0, percent: 0 },
        improvement: null as null | { resolved: number; new: number }
      };
    }

    const validationLogs = logs.filter(
      (log) => log.status === 'warning' || log.event_type.includes('VALIDATION')
    );

    const today = new Date();
    const weeksData: WeekData[] = [];

    // Calculate data for the last 4 weeks
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });

      const weekLogs = validationLogs.filter((log) => {
        const logDate = parseISO(log.created_at);
        return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
      });

      const transactionsAffected = new Set<string>();
      let criticalAlerts = 0;
      let highDiscrepancy = 0;

      weekLogs.forEach((log) => {
        if (log.transaction_code) {
          transactionsAffected.add(log.transaction_code);
        }

        const payload = log.payload as { _validation?: { errors?: string[]; warnings?: string[] } } | null;
        const validation = payload?._validation;

        if (validation?.errors?.some(e => e.includes('CRÍTICO') || e.includes('extrema'))) {
          criticalAlerts++;
        }
        if (validation?.warnings?.some(w => w.includes('Discrepância alta'))) {
          highDiscrepancy++;
        }
      });

      weeksData.push({
        weekLabel: i === 0 
          ? 'Esta semana' 
          : i === 1 
            ? 'Semana passada' 
            : `${format(weekStart, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`,
        weekStart,
        weekEnd,
        totalAlerts: weekLogs.length,
        criticalAlerts,
        highDiscrepancy,
        transactionsAffected,
      });
    }

    // Calculate week-over-week comparison
    const currentWeek = weeksData[0];
    const lastWeek = weeksData[1];
    const change = currentWeek.totalAlerts - lastWeek.totalAlerts;
    const percent = lastWeek.totalAlerts > 0 
      ? ((change / lastWeek.totalAlerts) * 100) 
      : currentWeek.totalAlerts > 0 ? 100 : 0;

    // Calculate improvement metrics
    const improvement = {
      resolved: Math.max(0, lastWeek.totalAlerts - currentWeek.totalAlerts),
      new: Math.max(0, currentWeek.totalAlerts - lastWeek.totalAlerts),
    };

    return { weeks: weeksData, comparison: { change, percent }, improvement };
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxAlerts = Math.max(...weeks.map(w => w.totalAlerts), 1);
  const isImproving = comparison.change < 0;
  const isWorsening = comparison.change > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Resumo Semanal de Alertas</CardTitle>
          </div>
          {weeks.length >= 2 && (
            <Badge 
              variant="secondary" 
              className={`flex items-center gap-1 ${
                isImproving 
                  ? 'bg-green-500/10 text-green-600' 
                  : isWorsening 
                    ? 'bg-red-500/10 text-red-600' 
                    : 'bg-muted'
              }`}
            >
              {isImproving ? (
                <TrendingDown className="h-3 w-3" />
              ) : isWorsening ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {Math.abs(comparison.percent).toFixed(0)}% vs semana anterior
            </Badge>
          )}
        </div>
        <CardDescription>
          Comparação de alertas de validação nas últimas 4 semanas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week comparison visualization */}
        <div className="space-y-3">
          {weeks.map((week, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {week.weekLabel}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {week.totalAlerts}
                  </span>
                  {week.criticalAlerts > 0 && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      {week.criticalAlerts} críticos
                    </Badge>
                  )}
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={(week.totalAlerts / maxAlerts) * 100} 
                  className={`h-3 ${index === 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted-foreground/30'}`}
                />
                {week.highDiscrepancy > 0 && (
                  <div 
                    className="absolute top-0 left-0 h-3 bg-orange-500/50 rounded-full"
                    style={{ width: `${(week.highDiscrepancy / maxAlerts) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{week.transactionsAffected.size} transações afetadas</span>
                {week.highDiscrepancy > 0 && (
                  <span className="text-orange-600">{week.highDiscrepancy} discrepâncias altas</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Week over week comparison */}
        {weeks.length >= 2 && (
          <div className="pt-3 border-t">
            <h4 className="text-sm font-medium mb-3">Comparação: Esta semana vs Anterior</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isImproving ? 'bg-green-500/10' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className={`h-4 w-4 ${isImproving ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium">Melhoria</span>
                </div>
                <p className={`text-xl font-bold ${isImproving ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {improvement?.resolved || 0}
                </p>
                <p className="text-xs text-muted-foreground">menos alertas</p>
              </div>
              <div className={`p-3 rounded-lg ${isWorsening ? 'bg-red-500/10' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`h-4 w-4 ${isWorsening ? 'text-red-600' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium">Novos</span>
                </div>
                <p className={`text-xl font-bold ${isWorsening ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {improvement?.new || 0}
                </p>
                <p className="text-xs text-muted-foreground">alertas adicionais</p>
              </div>
            </div>
          </div>
        )}

        {/* Trend indicator */}
        {weeks.length >= 3 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tendência (4 semanas)</span>
              <div className="flex items-center gap-2">
                {weeks.slice(0, 4).reverse().map((week, i) => (
                  <div key={i} className="flex items-center">
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${week.totalAlerts === 0 
                          ? 'bg-green-500/20 text-green-600' 
                          : week.totalAlerts <= 2 
                            ? 'bg-amber-500/20 text-amber-600' 
                            : 'bg-red-500/20 text-red-600'
                        }`}
                    >
                      {week.totalAlerts}
                    </div>
                    {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
