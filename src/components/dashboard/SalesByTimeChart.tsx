import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SalesByTimeChartProps {
  data: Record<string, Record<string, number>>;
  currencies: string[];
}

const COLORS: Record<string, string> = {
  BRL: 'hsl(217, 100%, 50%)',
  USD: 'hsl(160, 100%, 35%)',
  EUR: 'hsl(38, 92%, 50%)',
};

export function SalesByTimeChart({ data, currencies }: SalesByTimeChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .map(([date, values]) => ({
        date,
        ...values,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }, [data]);

  // Calculate totals and growth
  const totals = useMemo(() => {
    const result: Record<string, { total: number; growth: number }> = {};
    
    currencies.forEach((currency) => {
      const values = chartData.map((d) => (d[currency] as number) || 0);
      const total = values.reduce((sum, v) => sum + v, 0);
      
      // Calculate growth (last 15 days vs first 15 days)
      const midPoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midPoint).reduce((sum, v) => sum + v, 0);
      const secondHalf = values.slice(midPoint).reduce((sum, v) => sum + v, 0);
      const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
      
      result[currency] = { total, growth };
    });
    
    return result;
  }, [chartData, currencies]);

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatCurrencyValue = (value: number, currency: string) => {
    try {
      return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return value.toLocaleString();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Evolução do Faturamento</CardTitle>
              <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
            </div>
            
            {/* Totals with growth indicator */}
            <div className="flex flex-wrap gap-4">
              {currencies.map((currency) => {
                const { total, growth } = totals[currency] || { total: 0, growth: 0 };
                const isPositive = growth >= 0;
                
                return (
                  <div key={currency} className="text-right">
                    <p className="text-lg font-bold" style={{ color: COLORS[currency] }}>
                      {formatCurrencyValue(total, currency)}
                    </p>
                    <div className={`flex items-center justify-end gap-1 text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{isPositive ? '+' : ''}{growth.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {currencies.map((currency, index) => (
                    <linearGradient key={currency} id={`color${currency}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`} stopOpacity={0}/>
                    </linearGradient>
                  ))}
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
                  formatter={(value: number, name: string) => [
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: name }).format(value),
                    name
                  ]}
                />
                <Legend />
                {currencies.map((currency, index) => (
                  <Area
                    key={currency}
                    type="monotone"
                    dataKey={currency}
                    stroke={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`}
                    fillOpacity={1}
                    fill={`url(#color${currency})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
