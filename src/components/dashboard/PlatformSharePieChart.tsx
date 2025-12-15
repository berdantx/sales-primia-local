import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/calculations/goalCalculations';

interface PlatformSharePieChartProps {
  hotmartTotal: number;
  tmbTotal: number;
}

const COLORS = {
  Hotmart: 'hsl(217, 100%, 50%)',
  TMB: 'hsl(160, 100%, 35%)',
};

export function PlatformSharePieChart({ hotmartTotal, tmbTotal }: PlatformSharePieChartProps) {
  const data = [
    { name: 'Hotmart', value: hotmartTotal },
    { name: 'TMB', value: tmbTotal },
  ].filter(d => d.value > 0);

  const total = hotmartTotal + tmbTotal;

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Participação por Plataforma</CardTitle>
          <p className="text-sm text-muted-foreground">Distribuição do faturamento total</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value, 'BRL'), 'Total']}
                  />
                  <Legend 
                    formatter={(value) => (
                      <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </div>
          
          {total > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Total Combinado</p>
              <p className="text-2xl font-bold">{formatCurrency(total, 'BRL')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
