import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CountryDistributionProps {
  data: Record<string, number>;
}

const COLORS = [
  'hsl(217, 100%, 50%)',
  'hsl(160, 100%, 35%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(200, 70%, 50%)',
];

export function CountryDistribution({ data }: CountryDistributionProps) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col min-h-[400px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Distribuição por País</CardTitle>
          <p className="text-xs text-muted-foreground">Top 6 países por transações</p>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="30%"
                  outerRadius="70%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [
                    `${value} (${((value / total) * 100).toFixed(1)}%)`,
                    'Transações'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
