import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ChannelData {
  label: string;
  emoji: string;
  count: number;
  percentage: number;
  iaql: number;
  accentColor: string;
}

interface ChannelComparisonCardsProps {
  byTrafficType: Record<string, number>;
  total: number;
  isLoading?: boolean;
}

function getChannelIAQL(count: number, total: number): number {
  if (total === 0) return 0;
  const share = (count / total) * 100;
  // Simplified IAQL per channel based on share and volume
  return Math.min(100, Math.round(share * 1.2 + Math.min(count / 10, 30)));
}

export function ChannelComparisonCards({ byTrafficType, total, isLoading }: ChannelComparisonCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const channels: ChannelData[] = [
    {
      label: 'Tráfego Pago',
      emoji: '💰',
      count: byTrafficType['paid'] || 0,
      percentage: total > 0 ? ((byTrafficType['paid'] || 0) / total) * 100 : 0,
      iaql: getChannelIAQL(byTrafficType['paid'] || 0, total),
      accentColor: 'border-t-blue-400',
    },
    {
      label: 'Orgânico',
      emoji: '🌱',
      count: byTrafficType['organic'] || 0,
      percentage: total > 0 ? ((byTrafficType['organic'] || 0) / total) * 100 : 0,
      iaql: getChannelIAQL(byTrafficType['organic'] || 0, total),
      accentColor: 'border-t-emerald-400',
    },
    {
      label: 'Direto',
      emoji: '🔗',
      count: byTrafficType['direct'] || 0,
      percentage: total > 0 ? ((byTrafficType['direct'] || 0) / total) * 100 : 0,
      iaql: getChannelIAQL(byTrafficType['direct'] || 0, total),
      accentColor: 'border-t-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {channels.map(ch => (
        <div
          key={ch.label}
          className={cn(
            'bg-card border border-border/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-t-[3px]',
            ch.accentColor
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{ch.emoji}</span>
            <span className="text-sm font-semibold text-foreground">{ch.label}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              {ch.count.toLocaleString('pt-BR')}
            </p>
            <span className="text-xs text-muted-foreground">
              {ch.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">IAQL</span>
            <span className="text-sm font-bold text-foreground">{ch.iaql}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full bg-primary/60 transition-all duration-500"
              style={{ width: `${Math.min(ch.iaql, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
