import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Goal } from '@/hooks/useGoals';
import { calculateGoalProgress, formatCurrency, formatPercent } from '@/lib/calculations/goalCalculations';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalProgressCardProps {
  goal: Goal;
  totalSold: number;
}

export function GoalProgressCard({ goal, totalSold }: GoalProgressCardProps) {
  const progress = calculateGoalProgress(goal, totalSold);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {goal.name}
            </CardTitle>
            <Badge variant={progress.isOnTrack ? 'default' : 'destructive'}>
              {progress.isOnTrack ? (
                <><TrendingUp className="h-3 w-3 mr-1" /> No ritmo</>
              ) : (
                <><TrendingDown className="h-3 w-3 mr-1" /> Atrasado</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{formatCurrency(progress.totalSold, goal.currency)}</span>
              <span className="text-muted-foreground">
                {formatCurrency(goal.target_value, goal.currency)}
              </span>
            </div>
            <Progress value={progress.progressPercent} className="h-3" />
            <p className="text-sm text-muted-foreground mt-1">
              {formatPercent(progress.progressPercent)} concluído
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">
                {formatCurrency(progress.perDay, goal.currency)}
              </p>
              <p className="text-xs text-muted-foreground">por dia</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">
                {formatCurrency(progress.perWeek, goal.currency)}
              </p>
              <p className="text-xs text-muted-foreground">por semana</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">
                {formatCurrency(progress.perMonth, goal.currency)}
              </p>
              <p className="text-xs text-muted-foreground">por mês</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="h-4 w-4" />
            <span>
              {progress.daysRemaining} dias restantes • 
              Até {format(parseISO(goal.end_date), "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
