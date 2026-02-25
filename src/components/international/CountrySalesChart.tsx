import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CountryData {
  country: string;
  count: number;
  total: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))',
];

export function CountrySalesChart({ data }: { data: CountryData[] }) {
  const top10 = data.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vendas por País</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <YAxis type="category" dataKey="country" width={75} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {top10.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
