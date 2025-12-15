import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ComparisonChartProps {
  hotmartData: Record<string, Record<string, number>>;
  tmbData: Record<string, Record<string, number>>;
}

export function ComparisonChart({ hotmartData, tmbData }: ComparisonChartProps) {
  const chartData = useMemo(() => {
    const allDates = new Set([
      ...Object.keys(hotmartData),
      ...Object.keys(tmbData),
    ]);

    return Array.from(allDates)
      .sort()
      .slice(-30)
      .map((date) => ({
        date,
        Hotmart: hotmartData[date]?.BRL || 0,
        TMB: tmbData[date]?.BRL || 0,
      }));
  }, [hotmartData, tmbData]);

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Evolução Comparativa (BRL)</CardTitle>
          <p className="text-sm text-muted-foreground">Hotmart vs TMB - Últimos 30 dias</p>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHotmart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 100%, 50%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(217, 100%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTMB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 100%, 35%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(160, 100%, 35%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(parseISO(value), 'dd/MM', { locale: ptBR })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={formatValue}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => format(parseISO(value as string), "dd 'de' MMMM", { locale: ptBR })}
                  formatter={(value: number, name: string) => [formatCurrencyValue(value), name]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Hotmart"
                  stroke="hsl(217, 100%, 50%)"
                  fillOpacity={1}
                  fill="url(#colorHotmart)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="TMB"
                  stroke="hsl(160, 100%, 35%)"
                  fillOpacity={1}
                  fill="url(#colorTMB)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
