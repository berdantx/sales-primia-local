import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlatformSharePieChartProps {
  hotmartTotal: number;
  tmbTotal: number;
  eduzzTotal: number;
}

const COLORS = {
  Hotmart: 'hsl(217, 55%, 55%)',
  TMB: 'hsl(160, 40%, 45%)',
  Eduzz: 'hsl(270, 35%, 55%)',
};

export function PlatformSharePieChart({ hotmartTotal, tmbTotal, eduzzTotal }: PlatformSharePieChartProps) {
  const data = [
    { name: 'Hotmart', value: hotmartTotal },
    { name: 'TMB', value: tmbTotal },
    { name: 'Eduzz', value: eduzzTotal },
  ].filter(d => d.value > 0);

  const total = hotmartTotal + tmbTotal + eduzzTotal;

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
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
    <div className="bg-card border border-border rounded-2xl shadow-sm h-full flex flex-col">
      <div className="p-5 sm:p-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-foreground">Participação por Plataforma</h3>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground border-border">
            Distribuição
          </Badge>
        </div>
      </div>
      <div className="flex-1 px-2 pb-4 min-h-[240px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel}
                innerRadius="30%" outerRadius="70%" fill="#8884d8" dataKey="value" paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatCurrency(value, 'BRL'), 'Total']}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
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
        <div className="px-5 pb-4 pt-2 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">Total Combinado</p>
          <p className="text-lg font-bold">{formatCurrency(total, 'BRL')}</p>
        </div>
      )}
    </div>
  );
}
