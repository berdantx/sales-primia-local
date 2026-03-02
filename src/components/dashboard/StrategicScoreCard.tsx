import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StrategicScoreCardProps {
  rhythmPercent?: number;
  goalProgress?: number;
  periodPercent?: number;
  conversionRate?: number;
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
    const rhythmScore = Math.min(rhythmPercent, 100);
    const goalScore = hasGoal ? goalProgress : 50;
    const conversionScore = Math.min(conversionRate * 10, 100);
    const timingScore = (() => {
      if (!hasGoal || periodPercent === 0) return 50;
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

  const { scoreColor, arcColor, statusLabel, microPhrase } = useMemo(() => {
    if (score >= 80) return {
      scoreColor: 'text-emerald-600',
      arcColor: 'stroke-emerald-500',
      statusLabel: 'Status Operacional: Saudável',
      microPhrase: 'Performance ideal. Meta sob controle, ritmo sustentável.',
    };
    if (score >= 65) return {
      scoreColor: 'text-amber-500',
      arcColor: 'stroke-amber-400',
      statusLabel: 'Status Operacional: Atenção',
      microPhrase: 'Execução estável, porém meta sob pressão. Monitorar ritmo.',
    };
    if (score >= 50) return {
      scoreColor: 'text-amber-600',
      arcColor: 'stroke-amber-500',
      statusLabel: 'Status Operacional: Risco Moderado',
      microPhrase: 'Ritmo atual não sustenta fechamento no cenário projetado.',
    };
    return {
      scoreColor: 'text-red-600',
      arcColor: 'stroke-red-500',
      statusLabel: 'Status Operacional: Crítico',
      microPhrase: 'Alta probabilidade de subentrega. Ação corretiva urgente.',
    };
  }, [score]);

  const radius = 42;
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
    <div className="bg-card border border-border/80 rounded-xl p-6 sm:p-7 pb-8 sm:pb-9 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <h3 className="text-sm font-extrabold text-foreground tracking-tight uppercase">IGPL</h3>
          <p className="text-xs text-muted-foreground/60 font-medium tracking-wide">Índice Global de Performance de Lançamento</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 flex-1">
        {/* Arc gauge */}
        <div className="relative w-[160px] h-[160px] flex-shrink-0 my-1">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="9"
            />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              className={arcColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-muted-foreground/40 tracking-[0.25em] uppercase mb-0.5">IGPL</span>
            <span className={cn("text-5xl font-extrabold tracking-tighter", scoreColor)}>
              {score}
            </span>
            <span className="text-[8px] text-muted-foreground/30 font-medium tracking-widest">/ 100</span>
          </div>
        </div>

        <p className={cn("text-xs font-bold tracking-[0.15em] text-center uppercase", scoreColor)}>{statusLabel}</p>

        {/* Micro-frase interpretativa */}
        <p className="text-xs text-muted-foreground/70 text-center leading-relaxed italic px-2 max-w-[240px]">
          {microPhrase}
        </p>

        {/* Factors */}
        <div className="w-full space-y-3 mt-auto">
          {factors.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{f.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    f.value >= 80 ? 'bg-emerald-400' : f.value >= 65 ? 'bg-amber-400' : f.value >= 50 ? 'bg-amber-500' : 'bg-red-400'
                  )}
                  style={{ width: `${f.value}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground/70 w-7 text-right font-medium tabular-nums">{f.value}</span>
            </div>
          ))}
        </div>

        {/* Faixas legend */}
        <div className="w-full flex items-center justify-center gap-3 pt-1">
          {[
            { color: 'bg-emerald-400', label: '80+' },
            { color: 'bg-amber-400', label: '65–79' },
            { color: 'bg-amber-500', label: '50–64' },
            { color: 'bg-red-400', label: '<50' },
          ].map((band) => (
            <div key={band.label} className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", band.color)} />
              <span className="text-[10px] text-muted-foreground/50 font-medium">{band.label}</span>
            </div>
          ))}
        </div>

        <Link to="/igpl" className="text-[11px] text-primary/70 hover:text-primary font-medium transition-colors mt-1">
          Saiba mais →
        </Link>
      </div>
    </div>
  );
}
