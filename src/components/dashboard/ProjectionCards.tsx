import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, GoalProgress } from '@/lib/calculations/goalCalculations';
import { CalendarDays, CalendarRange, Calendar } from 'lucide-react';

interface ProjectionCardsProps {
  progress: GoalProgress;
  currency: string;
}

export function ProjectionCards({ progress, currency }: ProjectionCardsProps) {
  const projections = [
    {
      title: 'Meta Diária',
      value: progress.perDay,
      subtitle: `${progress.daysRemaining} dias restantes`,
      icon: CalendarDays,
      color: 'text-primary',
    },
    {
      title: 'Meta Semanal',
      value: progress.perWeek,
      subtitle: `${progress.weeksRemaining} semanas restantes`,
      icon: CalendarRange,
      color: 'text-chart-4',
    },
    {
      title: 'Meta Mensal',
      value: progress.perMonth,
      subtitle: `${progress.monthsRemaining} meses restantes`,
      icon: Calendar,
      color: 'text-success',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-semibold">Projeções para Atingir a Meta</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {projections.map((projection, index) => (
            <Card key={projection.title} className="hover:shadow-medium transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${projection.color}`}>
                    <projection.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{projection.title}</p>
                    <p className={`text-xl font-bold ${projection.color}`}>
                      {formatCurrency(projection.value, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{projection.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
