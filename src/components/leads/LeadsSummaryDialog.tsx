import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Megaphone, Users, TrendingUp } from 'lucide-react';
import { LeadStatsOptimized } from '@/hooks/useLeadStatsOptimized';
import { ConversionAdItem } from '@/hooks/useTopAdsByConversion';

interface LeadsSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: LeadStatsOptimized | undefined;
  clientName: string;
  topConversionAds: ConversionAdItem[];
  isLoadingAds: boolean;
}

const formatNumber = (n: number) =>
  new Intl.NumberFormat('pt-BR').format(n);

const formatPercent = (value: number, total: number) =>
  total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

const trafficLabels: Record<string, string> = {
  paid: 'Tráfego Pago',
  organic: 'Tráfego Orgânico',
  direct: 'Tráfego Direto',
};

const trafficOrder = ['paid', 'organic', 'direct'];

export function LeadsSummaryDialog({
  open,
  onOpenChange,
  stats,
  clientName,
  topConversionAds,
  isLoadingAds,
}: LeadsSummaryDialogProps) {
  const year = new Date().getFullYear();
  const total = stats?.total || 0;
  const byTrafficType = stats?.byTrafficType || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Captação de Leads: {clientName || 'Todos'} - {year}
          </DialogTitle>
        </DialogHeader>

        {/* Traffic breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Resumo por Tráfego
          </h3>
          <div className="space-y-2">
            {trafficOrder.map((key) => {
              const count = byTrafficType[key] || 0;
              const pct = formatPercent(count, total);
              const barWidth = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{trafficLabels[key]}</span>
                    <span className="tabular-nums">
                      {formatNumber(count)}{' '}
                      <span className="text-muted-foreground">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Total: {formatNumber(total)} leads
          </p>
        </div>

        <Separator />

        {/* Top 5 conversion ads */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Top 5 — Anúncios que mais convertem
          </h3>

          {isLoadingAds ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : topConversionAds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum anúncio com conversões no período.
            </p>
          ) : (
            <div className="space-y-2">
              {topConversionAds.slice(0, 5).map((ad, index) => (
                <div
                  key={ad.name}
                  className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 text-center">
                    {index < 3 ? (
                      <Trophy
                        className={`h-4 w-4 mx-auto ${
                          index === 0
                            ? 'text-yellow-500'
                            : index === 1
                            ? 'text-slate-400'
                            : 'text-amber-600'
                        }`}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={ad.name}>
                      {ad.name}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{ad.totalLeads} leads</span>
                      <span className="font-semibold text-primary">
                        {ad.convertedLeads} convertidos
                      </span>
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {ad.conversionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
