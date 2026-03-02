import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface StrategicScoreCardProps {
  rhythmPercent?: number; // 0-200+
  goalProgress?: number; // 0-100
  periodPercent?: number; // 0-100
  conversionRate?: number; // 0-100
  hasGoal: boolean;
}

export function StrategicScoreCard({
  rhythmPercent = 0,
  goalProgress = 0,
  periodPercent = 0,
  conversionRate = 0,
  hasGoal,
}: StrategicScoreCardProps) {
  const score = useMemo(() => {
    // Weighted score: rhythm 35%, goal 30%, conversion 20%, timing 15%
    const rhythmScore = Math.min(rhythmPercent, 100);
    const goalScore = hasGoal ? goalProgress : 50; // neutral if no goal
    const conversionScore = Math.min(conversionRate * 10, 100); // 10% conversion = 100 score
    const timingScore = (() => {
      if (!hasGoal || periodPercent === 0) return 50;
      // If goal progress is ahead of time, good
      const ratio = goalProgress / Math.max(periodPercent, 1);
      return Math.min(ratio * 100, 100);
    })();

    return Math.round(
      rhythmScore * 0.35 +
      goalScore * 0.30 +
      conversionScore * 0.20 +
      timingScore * 0.15
    );
  }, [rhythmPercent, goalProgress, periodPercent, conversionRate, hasGoal]);

  const scoreColor = score >= 75
    ? 'text-emerald-600'
    : score >= 50
    ? 'text-amber-600'
    : 'text-red-600';

  const scoreLabel = score >= 75
    ? 'Desempenho Saudável'
    : score >= 50
    ? 'Atenção Necessária'
    : 'Ação Urgente';

  const arcColor = score >= 75
    ? 'stroke-emerald-500'
    : score >= 50
    ? 'stroke-amber-500'
    : 'stroke-red-500';

  // SVG arc math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const arcPercent = Math.min(score, 100) / 100;
  const dashOffset = circumference * (1 - arcPercent);

  const factors = [
    { label: 'Ritmo', value: Math.min(Math.round(rhythmPercent), 100) },
    { label: 'Meta', value: Math.round(goalProgress) },
    { label: 'Conversão', value: Math.min(Math.round(conversionRate * 10), 100) },
    { label: 'Timing', value: hasGoal ? Math.min(Math.round((goalProgress / Math.max(periodPercent, 1)) * 100), 100) : 50 },
  ];

  return (
    <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Score Estratégico</h3>
          <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide uppercase">Índice global de performance</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Arc gauge */}
        <div className="relative w-[96px] h-[96px] flex-shrink-0">
          <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
            <circle
              cx="48" cy="48" r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            <circle
              cx="48" cy="48" r={radius}
              fill="none"
              className={arcColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-extrabold tracking-tight", scoreColor)}>
              {score}
            </span>
            <span className="text-[9px] text-muted-foreground/60 font-medium">/ 100</span>
          </div>
        </div>

        {/* Factors */}
        <div className="flex-1 space-y-2">
          <p className={cn("text-xs font-semibold mb-3", scoreColor)}>{scoreLabel}</p>
          {factors.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-16 shrink-0">{f.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    f.value >= 75 ? 'bg-emerald-400' : f.value >= 50 ? 'bg-amber-400' : 'bg-red-400'
                  )}
                  style={{ width: `${f.value}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground/70 w-7 text-right font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
