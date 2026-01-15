import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/calculations/goalCalculations';

interface PlatformSharePieChartProps {
  hotmartTotal: number;
  tmbTotal: number;
  eduzzTotal: number;
}

const COLORS = {
  Hotmart: 'hsl(217, 100%, 50%)',
  TMB: 'hsl(160, 100%, 35%)',
  Eduzz: 'hsl(270, 70%, 50%)',
};

export function PlatformSharePieChart({ hotmartTotal, tmbTotal, eduzzTotal }: PlatformSharePieChartProps) {
  const data = [
    { name: 'Hotmart', value: hotmartTotal },
    { name: 'TMB', value: tmbTotal },
    { name: 'Eduzz', value: eduzzTotal },
  ].filter(d => d.value > 0);

  const total = hotmartTotal + tmbTotal + eduzzTotal;

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
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col flex-1 min-h-[200px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Participação por Plataforma</CardTitle>
          <p className="text-xs text-muted-foreground">Distribuição do faturamento</p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 min-h-[240px]">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    innerRadius="30%"
                    outerRadius="70%"
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
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
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value, 'BRL'), 'Total']}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => (
                      <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </div>
          
          {total > 0 && (
            <div className="pt-3 mt-auto border-t text-center">
              <p className="text-xs text-muted-foreground">Total Combinado</p>
              <p className="text-lg font-bold">{formatCurrency(total, 'BRL')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
