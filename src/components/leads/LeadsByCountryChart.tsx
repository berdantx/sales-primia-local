import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, MapPin, Flag } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface LeadsByCountryChartProps {
  byCountry: Record<string, number>;
  byCity: Record<string, number>;
  isLoading?: boolean;
  totalLeads: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#f43f5e',
  '#f97316',
];

export function LeadsByCountryChart({ 
  byCountry, 
  byCity, 
  isLoading,
  totalLeads 
}: LeadsByCountryChartProps) {
  
  const countryData = useMemo(() => {
    return Object.entries(byCountry)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [byCountry]);

  const cityData = useMemo(() => {
    return Object.entries(byCity)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [byCity]);

  const uniqueCountries = Object.keys(byCountry).length;
  const uniqueCities = Object.keys(byCity).length;
  const leadsWithLocation = Object.values(byCountry).reduce((a, b) => a + b, 0) - (byCountry['Desconhecido'] || 0);
  const locationCoverage = totalLeads > 0 ? ((leadsWithLocation / totalLeads) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = countryData.length > 0 && countryData.some(d => d.name !== 'Desconhecido');

  if (!hasData) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Leads por Localização
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Dados de geolocalização não disponíveis</p>
            <p className="text-xs mt-1">Novos leads terão localização capturada automaticamente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <Tabs defaultValue="countries" className="flex flex-col h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Leads por Localização
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flag className="h-3 w-3" />
                {uniqueCountries} países
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {uniqueCities} cidades
              </span>
              <span>{locationCoverage}% com localização</span>
            </div>
          </div>
          <TabsList className="grid w-full grid-cols-2 mt-2">
            <TabsTrigger value="countries" className="flex items-center gap-2">
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Por País</span>
              <span className="sm:hidden">País</span>
            </TabsTrigger>
            <TabsTrigger value="cities" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Por Cidade</span>
              <span className="sm:hidden">Cidade</span>
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="pt-2 flex-1 overflow-hidden">
          <TabsContent value="countries" className="mt-0 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Pie Chart */}
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={countryData.filter(d => d.name !== 'Desconhecido')}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {countryData.filter(d => d.name !== 'Desconhecido').map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} leads`, 'Leads']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend 
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Ranking List */}
              <div className="space-y-2 overflow-auto max-h-[280px] pr-2">
                {countryData.filter(d => d.name !== 'Desconhecido').map((item, index) => {
                  const percentage = totalLeads > 0 ? ((item.value / totalLeads) * 100).toFixed(1) : '0';
                  return (
                    <div 
                      key={item.name}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.value} leads</span>
                          <span>•</span>
                          <span>{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="cities" className="mt-0 h-full">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cityData.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    fontSize={11}
                    width={95}
                    tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value} leads`, 'Leads']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
