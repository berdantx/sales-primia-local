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

  // Status
  const isRitmoAlinhado = ritmoAtualDiario >= ritmoNecessarioDiario;

  const RhythmLine = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{formatCurrency(value, currency)}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
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

          {/* Status */}
          <div className="mt-5">
            {isRitmoAlinhado ? (
              <span className="text-emerald-600 text-sm font-medium">Ritmo alinhado com a meta</span>
            ) : (
              <span className="text-amber-600 text-sm font-medium">Ritmo abaixo do necessário</span>
            )}
          </div>

          {/* Divider + Projeção */}
          <Separator className="my-6" />

          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Projeção de Fechamento no Ritmo Atual
            </span>
            <p className="text-2xl sm:text-3xl font-bold mt-2">
              {formatCurrency(projecaoFechamento, currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Se o ritmo atual for mantido até o fim do período.
            </p>
            <div className="mt-2">
              {isAboveTarget ? (
                <span className="text-emerald-600 text-sm font-medium">
                  Meta será superada no ritmo atual.
                </span>
              ) : (
                <span className="text-amber-600 text-sm font-medium">
                  Faltariam {formatCurrency(diferencaProjecao, currency)} para atingir a meta.
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
