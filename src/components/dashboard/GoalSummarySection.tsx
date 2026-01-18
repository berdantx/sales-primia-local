import { motion } from 'framer-motion';
import { Goal } from '@/hooks/useGoals';
import { calculateGoalProgress, formatCurrency, formatPercent } from '@/lib/calculations/goalCalculations';
import { ColoredKPICard } from './ColoredKPICard';
import { GoalProgressBar } from './GoalProgressBar';
import { ProjectionCards } from './ProjectionCards';
import { Target, TrendingUp, AlertCircle, TrendingUp as ProjectionIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalSummarySectionProps {
  goal: Goal;
  totalSold: number;
  projectionValue?: number;
}

export function GoalSummarySection({ goal, totalSold, projectionValue }: GoalSummarySectionProps) {
  const progress = calculateGoalProgress(goal, totalSold);
  
  const statusText = progress.progressPercent >= 100 
    ? 'Meta atingida!' 
    : progress.isOnTrack 
      ? 'Em progresso' 
      : 'Atenção necessária';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 text-xs sm:text-sm"
      >
        <Badge variant="outline" className="font-normal text-xs">
          Período da Meta Atual
        </Badge>
        <span className="text-muted-foreground">
          {format(parseISO(goal.start_date), "dd/MM/yyyy", { locale: ptBR })} até{' '}
          {format(parseISO(goal.end_date), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span className="text-primary font-medium">
          • {progress.daysRemaining} dias restantes
        </span>
      </motion.div>

      {/* 4 Colored KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <ColoredKPICard
          title="Meta de Faturamento"
          value={formatCurrency(goal.target_value, goal.currency)}
          subtitle={goal.name}
          icon={Target}
          variant="blue"
          delay={0}
        />
        <ColoredKPICard
          title="Faturamento Atual"
          value={formatCurrency(progress.totalSold, goal.currency)}
          subtitle={`${formatPercent(progress.progressPercent)} da meta`}
          icon={TrendingUp}
          variant="green"
          delay={1}
        />
        <ColoredKPICard
          title="Projeção Faturamento"
          value={formatCurrency(projectionValue ?? progress.totalSold, goal.currency)}
          subtitle="Inclui recorrências"
          icon={TrendingUp}
          variant="yellow"
          delay={2}
        />
        <ColoredKPICard
          title="Restante para Meta"
          value={formatCurrency(progress.remaining, goal.currency)}
          subtitle={progress.remaining === 0 ? 'Meta atingida!' : 'Valor a alcançar'}
          icon={AlertCircle}
          variant="orange"
          delay={3}
        />
      </div>

      {/* Progress Bar */}
      <GoalProgressBar goal={goal} progress={progress} />

      {/* Projection Cards */}
      {progress.remaining > 0 && (
        <ProjectionCards progress={progress} currency={goal.currency} />
      )}
    </div>
  );
}
