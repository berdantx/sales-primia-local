import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent, GoalProgress } from '@/lib/calculations/goalCalculations';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Goal } from '@/hooks/useGoals';

interface GoalProgressBarProps {
  goal: Goal;
  progress: GoalProgress;
}

export function GoalProgressBar({ goal, progress }: GoalProgressBarProps) {
  const progressValue = Math.min(100, progress.progressPercent);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Progresso da Meta</h3>
              <p className="text-2xl font-bold">
                {formatCurrency(progress.totalSold, goal.currency)}{' '}
                <span className="text-muted-foreground text-lg font-normal">
                  / {formatCurrency(goal.target_value, goal.currency)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {formatPercent(progress.progressPercent)}
              </p>
              <p className="text-sm text-muted-foreground">
                {progress.daysRemaining} dias restantes
              </p>
            </div>
          </div>
          
          {/* Progress bar container */}
          <div className="relative">
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-[hsl(217,100%,60%)] rounded-full"
              />
            </div>
            
            {/* Date labels */}
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{format(parseISO(goal.start_date), "dd/MM/yyyy", { locale: ptBR })}</span>
              <span>{format(parseISO(goal.end_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
