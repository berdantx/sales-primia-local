import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Vendas por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
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
