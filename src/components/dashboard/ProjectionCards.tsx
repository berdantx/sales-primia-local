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

  const isExpired = daysRemaining <= 0 && daysElapsed >= totalDays;
  const metaTotal = totalSold + remaining;
  const metaAtingida = totalSold >= metaTotal;

  // Ritmo Necessário
  const ritmoNecessarioDiario = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const ritmoNecessarioSemanal = ritmoNecessarioDiario * 7;
  const ritmoNecessarioMensal = ritmoNecessarioDiario * 30;

  // Ritmo Atual
  const safeDaysElapsed = Math.max(1, Math.min(daysElapsed, totalDays || daysElapsed));
  const ritmoAtualDiario = totalSold / safeDaysElapsed;
  const ritmoAtualSemanal = ritmoAtualDiario * 7;
  const ritmoAtualMensal = ritmoAtualDiario * 30;

  // Projeção de Fechamento
  const projecaoFechamento = ritmoAtualDiario * totalDays;
  const isAboveTarget = projecaoFechamento >= metaTotal;
  const diferencaProjecao = Math.abs(projecaoFechamento - metaTotal);

  // Status & Gap
  const isRitmoAlinhado = isExpired ? metaAtingida : ritmoAtualDiario >= ritmoNecessarioDiario;
  const gapPercent = ritmoNecessarioDiario > 0
    ? ((ritmoAtualDiario / ritmoNecessarioDiario) - 1) * 100
    : (isExpired ? 0 : 0);
  const gapAbs = Math.abs(gapPercent);
  const gapFormatted = gapAbs < 10 ? gapAbs.toFixed(1) : Math.round(gapAbs).toString();

  const gapRatio = ritmoNecessarioDiario > 0 ? Math.min(ritmoAtualDiario / ritmoNecessarioDiario, 1) : (isExpired ? (metaAtingida ? 1 : 0) : 0);
  const periodPercent = totalDays > 0 ? Math.min(Math.round((daysElapsed / totalDays) * 100), 100) : 0;

  

  const RhythmLine = ({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${highlight ? 'font-medium' : ''} text-muted-foreground`}>{label}</span>
      <span className={`tabular-nums ${highlight ? 'text-xl font-bold' : 'text-base font-semibold'}`}>{formatCurrency(value, currency)}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-0 sm:divide-x sm:divide-border/40">
            {/* Coluna Esquerda — Ritmo Necessário */}
            <div className="sm:pr-8">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Ritmo Necessário
              </span>
              <div className="mt-3 space-y-0">
                <RhythmLine label="Diário" value={ritmoNecessarioDiario} highlight />
                <RhythmLine label="Semanal" value={ritmoNecessarioSemanal} />
                <RhythmLine label="Mensal" value={ritmoNecessarioMensal} />
              </div>
            </div>

            {/* Coluna Direita — Ritmo Atual */}
            <div className="sm:pl-8">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Ritmo Atual
              </span>
              <div className="mt-3 space-y-0">
                <RhythmLine label="Diário" value={ritmoAtualDiario} highlight />
                <RhythmLine label="Semanal" value={ritmoAtualSemanal} />
                <RhythmLine label="Mensal" value={ritmoAtualMensal} />
              </div>
            </div>
          </div>

          {/* Verdict Zone */}
          <div className={`mt-6 rounded-xl px-4 py-3 border ${isRitmoAlinhado ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30'}`}>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${isRitmoAlinhado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className={`text-sm font-semibold ${isRitmoAlinhado ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {isExpired
                  ? (metaAtingida ? 'Meta atingida no período' : 'Período encerrado — meta não atingida')
                  : (isRitmoAlinhado ? 'Ritmo sustenta o fechamento da meta' : 'Ritmo atual não sustenta o fechamento da meta')}
              </span>
            </div>
            <div className="flex items-center gap-3 ml-[18px] mt-1.5">
              <p className={`text-sm ${isRitmoAlinhado ? 'text-emerald-700/70 dark:text-emerald-400/70' : 'text-amber-700/70 dark:text-amber-400/70'}`}>
                {isExpired
                  ? (metaAtingida
                    ? `Meta superada em ${formatCurrency(totalSold - metaTotal, currency)}.`
                    : `Faltaram ${formatCurrency(remaining, currency)} para atingir a meta.`)
                  : <>
                      O ritmo atual está{' '}
                      <span className="font-semibold tabular-nums">{gapFormatted}%</span>{' '}
                      {isRitmoAlinhado ? 'acima' : 'abaixo'} do exigido, com{' '}
                      <span className="font-semibold tabular-nums">{periodPercent}%</span>{' '}
                      do período já decorrido.
                    </>}
              </p>
              {!isExpired && (
                <>
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide flex-shrink-0 hidden sm:inline">Performance relativa</span>
                  <motion.div
                    className="h-1 w-16 rounded-full bg-muted/60 overflow-hidden flex-shrink-0"
                    initial={{ opacity: 0, scaleX: 0.98 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
                    style={{ originX: 0 }}
                  >
                    <motion.div
                      className={`h-full rounded-full ${isRitmoAlinhado ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${gapRatio * 100}%` }}
                      transition={{ delay: 0.8, duration: 0.5, ease: 'easeOut' }}
                    />
                  </motion.div>
                </>
              )}
            </div>
          </div>

          {/* Divider + Projeção */}
          <Separator className="my-6 bg-muted/40" />

          <div>
            <span className="text-xs text-muted-foreground/80 uppercase tracking-wide block">
              {isExpired ? 'Resultado Final' : 'Fechamento Projetado'}
            </span>
            <p className="text-2xl sm:text-3xl font-bold mt-1.5 tabular-nums tracking-tight">
              {formatCurrency(isExpired ? totalSold : projecaoFechamento, currency)}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              Meta: {formatCurrency(metaTotal, currency)}
            </p>
            {!isExpired && (
              <>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {isAboveTarget
                    ? 'No ritmo atual, o fechamento superará a meta.'
                    : 'No ritmo atual, o fechamento ficará abaixo da meta.'}
                </p>
                <p className={`text-sm font-semibold mt-1.5 tabular-nums ${isAboveTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isAboveTarget
                    ? `Superávit projetado: ${formatCurrency(diferencaProjecao, currency)}`
                    : `Para atingir a meta, é necessário aumentar o ritmo diário em ${formatCurrency(daysRemaining > 0 ? diferencaProjecao / daysRemaining : diferencaProjecao, currency)}.`}
                </p>
              </>
            )}
            {isExpired && (
              <p className={`text-sm font-semibold mt-1.5 tabular-nums ${metaAtingida ? 'text-emerald-600' : 'text-amber-600'}`}>
                {metaAtingida
                  ? `Superávit: ${formatCurrency(totalSold - metaTotal, currency)}`
                  : `Déficit: ${formatCurrency(remaining, currency)}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
