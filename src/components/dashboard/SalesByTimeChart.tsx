import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, BarChart3, AreaChart as AreaChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface SalesByTimeChartProps {
  data: Record<string, Record<string, number>>;
  currencies: string[];
}

const COLORS: Record<string, string> = {
  BRL: 'hsl(217, 100%, 50%)',
  USD: 'hsl(160, 100%, 35%)',
  EUR: 'hsl(38, 92%, 50%)',
};

type ChartType = 'line' | 'bar' | 'area' | 'pie';

export function SalesByTimeChart({ data, currencies }: SalesByTimeChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  
  const chartData = useMemo(() => {
    return Object.entries(data)
      .map(([date, values]) => ({
        date,
        ...values,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [data]);

  const totals = useMemo(() => {
    const result: Record<string, { total: number; growth: number }> = {};
    
    currencies.forEach((currency) => {
      const values = chartData.map((d) => (d[currency] as number) || 0);
      const total = values.reduce((sum, v) => sum + v, 0);
      
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

  const commonXAxis = (
    <XAxis 
      dataKey="date" 
      tickFormatter={(value) => format(parseISO(value), 'dd/MM', { locale: ptBR })}
      stroke="hsl(var(--muted-foreground))"
      fontSize={10}
      tickLine={false}
      axisLine={false}
    />
  );

  const commonTooltip = (
    <Tooltip 
      contentStyle={{ 
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        fontSize: '12px',
      }}
      labelFormatter={(value) => format(parseISO(value as string), "dd 'de' MMMM", { locale: ptBR })}
      formatter={(value: number, name: string) => [
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: name }).format(value),
        name === 'BRL' ? 'Real (R$)' : name === 'USD' ? 'Dólar (US$)' : name
      ]}
    />
  );

  const commonLegend = (
    <Legend 
      formatter={(value) => value === 'BRL' ? 'R$' : value === 'USD' ? 'US$' : value}
      wrapperStyle={{ fontSize: '10px' }}
    />
  );

  const pieData = useMemo(() => {
    return currencies.map(currency => ({
      name: currency === 'BRL' ? 'Real (R$)' : currency === 'USD' ? 'Dólar (US$)' : currency,
      value: totals[currency]?.total || 0,
      currency,
    }));
  }, [currencies, totals]);

  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0);

  const renderChart = () => {
    const margin = { top: 5, right: 50, left: -15, bottom: 0 };
    
    if (chartType === 'pie') {
      return (
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {pieData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.currency] || `hsl(${index * 60}, 70%, 50%)`}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, entry: any) => {
              const percent = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
              return [
                `${formatCurrencyValue(value, entry.payload.currency)} (${percent}%)`,
                name
              ];
            }}
          />
          {commonLegend}
        </PieChart>
      );
    }
    
    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          {commonXAxis}
          <YAxis 
            yAxisId="left"
            tickFormatter={formatValue}
            stroke={COLORS['BRL']}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tickFormatter={formatValue}
            stroke={COLORS['USD']}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          {commonTooltip}
          {commonLegend}
          {currencies.map((currency, index) => (
            <Bar
              key={currency}
              yAxisId={currency === 'BRL' ? 'left' : 'right'}
              dataKey={currency}
              fill={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`}
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </BarChart>
      );
    }
    
    if (chartType === 'area') {
      return (
        <AreaChart data={chartData} margin={margin}>
          <defs>
            {currencies.map((currency, index) => (
              <linearGradient key={currency} id={`color${currency}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          {commonXAxis}
          <YAxis 
            yAxisId="left"
            tickFormatter={formatValue}
            stroke={COLORS['BRL']}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tickFormatter={formatValue}
            stroke={COLORS['USD']}
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          {commonTooltip}
          {commonLegend}
          {currencies.map((currency, index) => (
            <Area
              key={currency}
              yAxisId={currency === 'BRL' ? 'left' : 'right'}
              type="monotone"
              dataKey={currency}
              stroke={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`}
              fillOpacity={1}
              fill={`url(#color${currency})`}
              strokeWidth={2}
              activeDot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--background))' }}
              connectNulls={true}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      );
    }
    
    // Default: line chart
    return (
      <LineChart data={chartData} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        {commonXAxis}
        <YAxis 
          yAxisId="left"
          tickFormatter={formatValue}
          stroke={COLORS['BRL']}
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          tickFormatter={formatValue}
          stroke={COLORS['USD']}
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        {commonTooltip}
        {commonLegend}
        {currencies.map((currency, index) => (
          <Line
            key={currency}
            yAxisId={currency === 'BRL' ? 'left' : 'right'}
            type="monotone"
            dataKey={currency}
            stroke={COLORS[currency] || `hsl(${index * 60}, 70%, 50%)`}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--background))' }}
            connectNulls={true}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}
      </LineChart>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="flex flex-col min-h-[400px] sm:min-h-[500px]">
        <CardHeader className="pb-2 space-y-2 sm:space-y-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Evolução do Faturamento</CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Últimos 30 dias</p>
            </div>
            <ToggleGroup 
              type="single" 
              value={chartType} 
              onValueChange={(v) => v && setChartType(v as ChartType)}
              className="bg-muted/50 rounded-lg p-0.5 self-start sm:self-auto"
            >
              <ToggleGroupItem value="line" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0 data-[state=on]:bg-background">
                <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="bar" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0 data-[state=on]:bg-background">
                <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="area" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0 data-[state=on]:bg-background">
                <AreaChartIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="pie" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0 data-[state=on]:bg-background">
                <PieChartIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {/* Compact totals */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {currencies.map((currency) => {
              const { total, growth } = totals[currency] || { total: 0, growth: 0 };
              const isPositive = growth >= 0;
              
              return (
                <div key={currency} className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-muted/50 rounded-lg">
                  <span className="text-xs sm:text-sm font-bold" style={{ color: COLORS[currency] }}>
                    {formatCurrencyValue(total, currency)}
                  </span>
                  <div className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? (
                      <TrendingUp className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                    ) : (
                      <TrendingDown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                    )}
                    <span>{isPositive ? '+' : ''}{growth.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-1 sm:pb-2 px-1 sm:px-2">
          <div className="h-full min-h-[280px] sm:min-h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
