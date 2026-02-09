import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Megaphone, BarChart3 } from 'lucide-react';
import { ConversionAdItem } from '@/hooks/useTopAdsByConversion';

interface TopAdsByConversionCardProps {
  items: ConversionAdItem[];
  isLoading: boolean;
  mode: 'ads' | 'campaigns';
  onModeChange: (mode: 'ads' | 'campaigns') => void;
}

const rankColors = [
  'text-yellow-500',
  'text-slate-400',
  'text-amber-600',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function TopAdsByConversionCard({
  items,
  isLoading,
  mode,
  onModeChange,
}: TopAdsByConversionCardProps) {
  const maxConverted = items.length > 0 ? Math.max(...items.map(i => i.convertedLeads)) : 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Criativos por Conversão
          </CardTitle>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && onModeChange(v as 'ads' | 'campaigns')}
            size="sm"
          >
            <ToggleGroupItem value="ads" className="text-xs gap-1">
              <Megaphone className="h-3.5 w-3.5" />
              Anúncios
            </ToggleGroupItem>
            <ToggleGroupItem value="campaigns" className="text-xs gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Campanhas
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum criativo com conversões encontrado no período.
          </p>
        ) : (
          items.map((item, index) => {
            const barWidth = (item.convertedLeads / maxConverted) * 100;
            return (
              <div
                key={item.name}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 text-center">
                  {index < 3 ? (
                    <Trophy className={`h-5 w-5 mx-auto ${rankColors[index]}`} />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      #{index + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-medium truncate" title={item.name}>
                    {item.name}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{item.totalLeads} leads</span>
                    <span className="font-semibold text-primary">
                      {item.convertedLeads} convertidos
                    </span>
                    <span>{item.conversionRate}%</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {formatCurrency(item.totalRevenue)}
                    </span>
                    <span>Ticket: {formatCurrency(item.avgTicket)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
