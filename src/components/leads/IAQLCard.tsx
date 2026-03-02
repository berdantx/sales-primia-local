import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface IAQLCardProps {
  score: number;
  trend?: number; // positive = improving
  interpretation: string;
  igplImpact?: string;
  isLoading?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 75) return 'border-t-emerald-400';
  if (score >= 50) return 'border-t-amber-400';
  return 'border-t-red-400';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excelente';
  if (score >= 65) return 'Saudável';
  if (score >= 50) return 'Atenção';
  return 'Crítico';
}

function getScoreBg(score: number) {
  if (score >= 75) return 'bg-emerald-50 text-emerald-700';
  if (score >= 50) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function getScoreDotColor(score: number) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function IAQLCard({ score, trend, interpretation, igplImpact, isLoading }: IAQLCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-6 sm:p-8 border-t-[3px] border-t-muted animate-pulse col-span-full lg:col-span-2">
        <div className="h-4 w-32 bg-muted rounded mb-6" />
        <div className="h-14 w-24 bg-muted rounded mb-4" />
        <div className="h-3 w-56 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-card border border-border/80 rounded-xl p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] border-t-[3px] col-span-full lg:col-span-2',
      getScoreColor(score)
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background', getScoreDotColor(score), 
            score >= 75 ? 'ring-emerald-500/20' : score >= 50 ? 'ring-amber-500/20' : 'ring-red-500/20'
          )} />
          <div>
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground block">
              ÍNDICE DE AQUISIÇÃO
            </span>
            <span className="text-sm text-foreground font-bold tracking-tight">IAQL</span>
          </div>
        </div>
        <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide', getScoreBg(score))}>
          {getScoreLabel(score)}
        </span>
      </div>

      {/* Score + Trend */}
      <div className="flex items-end gap-4 mb-4">
        <p className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground leading-none tabular-nums">
          {score}
        </p>
        <div className="pb-1.5">
          {trend !== undefined && trend !== 0 ? (
            <div className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              trend > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
            )}>
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend > 0 ? '+' : ''}{trend} pts / 7d
            </div>
          ) : trend === 0 ? (
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50">
              <Minus className="h-3 w-3" />
              estável
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 px-2 py-0.5 rounded-full bg-muted/30">
              <Activity className="h-3 w-3" />
              sem histórico
            </div>
          )}
        </div>
      </div>

      {/* Interpretation */}
      <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
        {interpretation}
      </p>

      {igplImpact && (
        <p className="text-[10px] text-muted-foreground/60 mt-3 border-t border-border/30 pt-2.5">
          {igplImpact}
        </p>
      )}
    </div>
  );
}
