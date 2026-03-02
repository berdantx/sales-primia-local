import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

interface Alert {
  color: 'green' | 'yellow' | 'red';
  text: string;
  action?: string;
}

interface StrategicRecommendationCardProps {
  hasGoal: boolean;
  goalProgress?: number; // 0-100
  topProduct?: string;
  leadCount?: number;
  totalRevenue?: number;
}

export function StrategicRecommendationCard({
  hasGoal,
  goalProgress = 0,
  topProduct,
  leadCount = 0,
  totalRevenue = 0,
}: StrategicRecommendationCardProps) {
  // Generate smart recommendations based on data
  const alerts: Alert[] = [];

  if (!hasGoal) {
    alerts.push({
      color: 'yellow',
      text: 'Nenhuma meta ativa definida',
      action: 'Criar uma meta para acompanhar progresso',
    });
  } else if (goalProgress < 30) {
    alerts.push({
      color: 'red',
      text: 'Meta abaixo do ritmo esperado',
      action: 'Revisar estratégia de conversão',
    });
  } else if (goalProgress >= 80) {
    alerts.push({
      color: 'green',
      text: 'Meta próxima de ser atingida',
      action: 'Considerar aumento da meta',
    });
  }

  if (leadCount === 0) {
    alerts.push({
      color: 'yellow',
      text: 'Sem captação de leads no período',
      action: 'Verificar landing pages e campanhas',
    });
  }

  if (totalRevenue === 0) {
    alerts.push({
      color: 'red',
      text: 'Nenhuma receita confirmada no período',
      action: 'Verificar status das transações',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      color: 'green',
      text: 'Operação funcionando normalmente',
      action: 'Continue monitorando os indicadores',
    });
  }

  const colorMap = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className="bg-primary/[0.05] border border-primary/10 rounded-2xl p-5 sm:p-6 h-full transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
        <h3 className="text-base font-bold text-foreground">Direcionamento Estratégico do Sistema</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground border-primary/20">
          Prioridade
        </Badge>
        <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground border-primary/20">
          Base: período atual
        </Badge>
        {topProduct && (
          <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground border-primary/20">
            Top: {topProduct}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colorMap[alert.color]}`} />
            <div>
              <p className="text-sm text-foreground leading-snug">{alert.text}</p>
              {alert.action && (
                <p className="text-xs text-muted-foreground mt-0.5">{alert.action}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
