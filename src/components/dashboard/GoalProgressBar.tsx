import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent, GoalProgress } from '@/lib/calculations/goalCalculations';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Goal } from '@/hooks/useGoals';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface GoalProgressBarProps {
  goal: Goal;
  progress: GoalProgress;
  salesByDate?: Record<string, Record<string, number>>;
  dollarRate?: number;
}

export function GoalProgressBar({ goal, progress, salesByDate, dollarRate }: GoalProgressBarProps) {
  const progressValue = Math.min(100, progress.progressPercent);

  // Process salesByDate into chart data
  const chartData = useMemo(() => {
    if (!salesByDate || Object.keys(salesByDate).length === 0) return [];
    
    const rate = dollarRate || 5.5;
    
    return Object.entries(salesByDate)
      .map(([date, values]) => ({
        date,
        value: (values.BRL || 0) + ((values.USD || 0) * rate),
        formattedDate: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days
  }, [salesByDate, dollarRate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = chartData.find(d => d.formattedDate === label);
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
          <p className="font-medium">{dataPoint?.formattedDate}</p>
          <p className="text-primary font-bold">
            {formatCurrency(payload[0].value, goal.currency)}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Progresso da Meta</h3>
              <p className="text-2xl font-bold">
                {formatCurrency(progress.totalSold, goal.currency)}{' '}
                <span className="text-muted-foreground text-lg font-normal">
                  / {formatCurrency(goal.target_value, goal.currency)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {formatPercent(progress.progressPercent)}
              </p>
              <p className="text-sm text-muted-foreground">
                {progress.daysRemaining} dias restantes
              </p>
            </div>
          </div>
          
          {/* Progress bar container */}
          <div className="relative">
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-[hsl(217,100%,60%)] rounded-full"
              />
            </div>
            
            {/* Date labels */}
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{format(parseISO(goal.start_date), "dd/MM/yyyy", { locale: ptBR })}</span>
              <span>{format(parseISO(goal.end_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          {/* Sparkline Chart - Daily Evolution */}
          {chartData.length > 2 && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Evolução Diária (últimos {chartData.length} dias)
              </p>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis 
                      dataKey="formattedDate" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      interval="preserveStartEnd"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
