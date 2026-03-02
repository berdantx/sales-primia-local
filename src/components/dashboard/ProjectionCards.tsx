import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, GoalProgress } from '@/lib/calculations/goalCalculations';
import { Separator } from '@/components/ui/separator';

interface ProjectionCardsProps {
  progress: GoalProgress;
  currency: string;
}

export function ProjectionCards({ progress, currency }: ProjectionCardsProps) {
  const { remaining, daysRemaining, daysElapsed, totalDays, totalSold } = progress;

  // Ritmo Necessário
  const ritmoNecessarioDiario = daysRemaining > 0 ? remaining / daysRemaining : remaining;
  const ritmoNecessarioSemanal = ritmoNecessarioDiario * 7;
  const ritmoNecessarioMensal = ritmoNecessarioDiario * 30;

  // Ritmo Atual
  const ritmoAtualDiario = totalSold / daysElapsed;
  const ritmoAtualSemanal = ritmoAtualDiario * 7;
  const ritmoAtualMensal = ritmoAtualDiario * 30;

  // Projeção de Fechamento
  const projecaoFechamento = ritmoAtualDiario * totalDays;
  const metaTotal = totalSold + remaining;
  const isAboveTarget = projecaoFechamento >= metaTotal;
  const diferencaProjecao = Math.abs(projecaoFechamento - metaTotal);

  // Status & Gap
  const isRitmoAlinhado = ritmoAtualDiario >= ritmoNecessarioDiario;
  const gapPercent = ritmoNecessarioDiario > 0
    ? ((ritmoAtualDiario / ritmoNecessarioDiario) - 1) * 100
    : 0;
  const gapAbs = Math.abs(gapPercent);
  const gapFormatted = gapAbs < 10 ? gapAbs.toFixed(1) : Math.round(gapAbs).toString();

  const RhythmLine = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{formatCurrency(value, currency)}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-semibold">Ritmo Necessário para Fechamento</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ritmo exigido vs ritmo atual, com projeção de fechamento.
            </p>
          </div>

          {/* Two-column rhythm comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
            {/* Coluna Esquerda — Ritmo Necessário */}
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Ritmo Necessário
              </span>
              <div className="mt-3 space-y-0">
                <RhythmLine label="Diário" value={ritmoNecessarioDiario} />
                <RhythmLine label="Semanal" value={ritmoNecessarioSemanal} />
                <RhythmLine label="Mensal" value={ritmoNecessarioMensal} />
              </div>
            </div>

            {/* Coluna Direita — Ritmo Atual */}
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Ritmo Atual
              </span>
              <div className="mt-3 space-y-0">
                <RhythmLine label="Diário" value={ritmoAtualDiario} />
                <RhythmLine label="Semanal" value={ritmoAtualSemanal} />
                <RhythmLine label="Mensal" value={ritmoAtualMensal} />
              </div>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="mt-6 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${isRitmoAlinhado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className={`text-sm font-semibold ${isRitmoAlinhado ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isRitmoAlinhado ? 'Ritmo alinhado com a meta' : 'Ritmo abaixo do necessário'}
              </span>
            </div>
            <p className={`text-sm ml-[18px] ${isRitmoAlinhado ? 'text-emerald-600/80' : 'text-amber-600/80'}`}>
              O ritmo atual está{' '}
              <span className="font-semibold tabular-nums">{gapFormatted}%</span>{' '}
              {isRitmoAlinhado ? 'acima' : 'abaixo'} do exigido.
            </p>
          </div>

          {/* Divider + Projeção */}
          <Separator className="my-6 bg-muted/40" />

          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Projeção de Fechamento no Ritmo Atual
            </span>
            <p className="text-2xl sm:text-3xl font-bold mt-2 tabular-nums">
              {formatCurrency(projecaoFechamento, currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAboveTarget
                ? 'Mantido o ritmo atual, a meta será atingida.'
                : 'Mantido o ritmo atual, a meta não será atingida.'}
            </p>
            <p className={`text-sm font-semibold mt-1.5 tabular-nums ${isAboveTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isAboveTarget ? 'Superávit' : 'Déficit'} projetado: {formatCurrency(diferencaProjecao, currency)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
