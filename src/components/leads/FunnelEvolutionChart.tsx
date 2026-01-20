import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FunnelDataPoint {
  date: string;
  totalLeads: number;
  qualifiedLeads: number;
  qualificationRate: number;
  convertedLeads: number;
  conversionRate: number;
  qualifiedConversionRate: number;
}

interface FunnelEvolutionChartProps {
  data: FunnelDataPoint[];
  isLoading?: boolean;
  groupBy: 'day' | 'week';
  onGroupByChange: (value: 'day' | 'week') => void;
}

export function FunnelEvolutionChart({
  data,
  isLoading = false,
  groupBy,
  onGroupByChange,
}: FunnelEvolutionChartProps) {
  const [viewMode, setViewMode] = useState<'rates' | 'counts'>('rates');

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      dateLabel: format(parseISO(d.date), groupBy === 'week' ? "'Sem' w" : 'dd/MM', { locale: ptBR }),
    }));
  }, [data, groupBy]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução do Funil
          </CardTitle>
          <div className="flex gap-2">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'rates' | 'counts')}
              size="sm"
            >
              <ToggleGroupItem value="rates" className="text-xs">
                Taxas %
              </ToggleGroupItem>
              <ToggleGroupItem value="counts" className="text-xs">
                Contagem
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup 
              type="single" 
              value={groupBy} 
              onValueChange={(v) => v && onGroupByChange(v as 'day' | 'week')}
              size="sm"
            >
              <ToggleGroupItem value="day" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Dia
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="text-xs">
                Semana
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(value) => viewMode === 'rates' ? `${value.toFixed(0)}%` : value.toString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number, name: string) => {
                  if (viewMode === 'rates') {
                    return [`${value.toFixed(2)}%`, name];
                  }
                  return [value.toLocaleString('pt-BR'), name];
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              {viewMode === 'rates' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="qualificationRate"
                    name="Taxa Qualificação"
                    stroke="hsl(280, 65%, 60%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversionRate"
                    name="Taxa Conversão"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="totalLeads"
                    name="Total Leads"
                    stroke="hsl(221, 83%, 53%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="qualifiedLeads"
                    name="Qualificados"
                    stroke="hsl(280, 65%, 60%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="convertedLeads"
                    name="Convertidos"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
