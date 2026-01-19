import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, Calendar, CalendarDays } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAdTrend, GroupBy, TrendDataPoint } from '@/hooks/useAdTrend';
import { Lead } from '@/hooks/useLeads';
import { ViewMode } from '@/hooks/useTopAds';

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
];

interface AdTrendChartProps {
  leads: Lead[] | undefined;
  topItemNames: string[];
  mode: ViewMode;
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
  isLoading?: boolean;
}

const truncateName = (name: string, maxLength: number = 20) => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3">
      <p className="font-medium text-sm mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground truncate max-w-[150px]">
              {entry.name}:
            </span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function AdTrendChart({
  leads,
  topItemNames,
  mode,
  groupBy,
  onGroupByChange,
  isLoading,
}: AdTrendChartProps) {
  const { trendData } = useAdTrend({ leads, topItemNames, mode, groupBy });

  const title = mode === 'ads' ? 'Evolução dos Anúncios' : 'Evolução das Campanhas';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando gráfico...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir no período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
          <ToggleGroup 
            type="single" 
            value={groupBy} 
            onValueChange={(value) => value && onGroupByChange(value as GroupBy)}
            size="sm"
          >
            <ToggleGroupItem value="day" aria-label="Agrupar por dia">
              <Calendar className="h-4 w-4 mr-1" />
              Dia
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Agrupar por semana">
              <CalendarDays className="h-4 w-4 mr-1" />
              Semana
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => truncateName(value, 25)}
                wrapperStyle={{ fontSize: '12px' }}
              />
              {topItemNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
