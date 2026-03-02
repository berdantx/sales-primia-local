import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export function IAQLCard({ score, trend, interpretation, igplImpact, isLoading }: IAQLCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-6 border-t-[3px] border-t-muted animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-10 w-20 bg-muted rounded mb-3" />
        <div className="h-3 w-48 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)] border-t-[3px]',
      getScoreColor(score)
    )}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <span className="text-[10px] tracking-wide uppercase text-muted-foreground block mb-1">
            ÍNDICE DE AQUISIÇÃO
          </span>
          <span className="text-sm text-foreground font-semibold">IAQL</span>
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getScoreBg(score))}>
          {getScoreLabel(score)}
        </span>
      </div>

      <div className="flex items-baseline gap-3 mt-3">
        <p className="text-4xl font-extrabold tracking-tight text-foreground leading-none">
          {score}
        </p>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trend > 0 ? 'text-emerald-600' : 'text-red-500'
          )}>
            {trend > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend > 0 ? '+' : ''}{trend} pts
          </div>
        )}
        {trend === 0 && (
          <div className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
            <Minus className="h-3.5 w-3.5" />
            estável
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        {interpretation}
      </p>

      {igplImpact && (
        <p className="text-[10px] text-muted-foreground/70 mt-2 border-t border-border/40 pt-2">
          {igplImpact}
        </p>
      )}
    </div>
  );
}
