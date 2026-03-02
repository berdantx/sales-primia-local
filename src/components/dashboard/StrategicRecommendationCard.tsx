import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight } from 'lucide-react';

type AlertArea = 'Conversão' | 'Ritmo' | 'Meta' | 'Timing' | 'Operação';

interface Alert {
  color: 'green' | 'yellow' | 'red';
  text: string;
  action?: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  impact: 'Alto impacto' | 'Impacto moderado' | 'Impacto baixo';
  area: AlertArea;
}

interface StrategicRecommendationCardProps {
  hasGoal: boolean;
  goalProgress?: number;
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
  const alerts: Alert[] = [];

  if (!hasGoal) {
    alerts.push({
      color: 'yellow',
      text: 'Nenhuma meta ativa definida',
      action: 'Criar uma meta para acompanhar progresso',
      priority: 'Alta',
      impact: 'Alto impacto',
      area: 'Meta',
    });
  } else if (goalProgress < 30) {
    alerts.push({
      color: 'red',
      text: 'Meta abaixo do ritmo esperado',
      action: 'Revisar estratégia de conversão',
      priority: 'Alta',
      impact: 'Alto impacto',
      area: 'Ritmo',
    });
  } else if (goalProgress >= 80) {
    alerts.push({
      color: 'green',
      text: 'Meta próxima de ser atingida',
      action: 'Considerar aumento da meta',
      priority: 'Baixa',
      impact: 'Impacto moderado',
      area: 'Meta',
    });
  }

  if (leadCount === 0) {
    alerts.push({
      color: 'yellow',
      text: 'Sem captação de leads no período',
      action: 'Verificar landing pages e campanhas',
      priority: 'Alta',
      impact: 'Alto impacto',
      area: 'Conversão',
    });
  }

  if (totalRevenue === 0) {
    alerts.push({
      color: 'red',
      text: 'Nenhuma receita confirmada no período',
      action: 'Verificar status das transações',
      priority: 'Alta',
      impact: 'Alto impacto',
      area: 'Operação',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      color: 'green',
      text: 'Operação funcionando normalmente',
      action: 'Continue monitorando os indicadores',
      priority: 'Baixa',
      impact: 'Impacto baixo',
      area: 'Operação',
    });
  }

  const colorMap = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const priorityColorMap = {
    Alta: 'bg-red-50 text-red-700 border-red-200',
    Média: 'bg-amber-50 text-amber-700 border-amber-200',
    Baixa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const impactColorMap = {
    'Alto impacto': 'bg-red-50/60 text-red-600 border-red-200/60',
    'Impacto moderado': 'bg-amber-50/60 text-amber-600 border-amber-200/60',
    'Impacto baixo': 'bg-muted text-muted-foreground border-border',
  };

  const areaColorMap: Record<AlertArea, string> = {
    Conversão: 'bg-violet-50 text-violet-700 border-violet-200',
    Ritmo: 'bg-blue-50 text-blue-700 border-blue-200',
    Meta: 'bg-amber-50 text-amber-700 border-amber-200',
    Timing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    Operação: 'bg-muted text-foreground/70 border-border',
  };

  return (
    <div className="bg-card border border-border/80 rounded-xl p-6 sm:p-7 h-full transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Recomendações Estratégicas</h3>
          <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide uppercase">Direcionamento tático</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground/70 border-border">
          Período atual
        </Badge>
        {topProduct && (
          <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground/70 border-border">
            Top: {topProduct}
          </Badge>
        )}
      </div>

      <div className="space-y-0">
        {alerts.map((alert, i) => (
          <div key={i} className={`py-4 ${i < alerts.length - 1 ? 'border-b border-border/40' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${colorMap[alert.color]} ring-2 ring-offset-1 ring-offset-card ${
                alert.color === 'green' ? 'ring-emerald-500/20' : alert.color === 'yellow' ? 'ring-amber-500/20' : 'ring-red-500/20'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] h-[18px] px-2 font-semibold ${priorityColorMap[alert.priority]}`}>
                    {alert.priority}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] h-[18px] px-2 font-normal ${impactColorMap[alert.impact]}`}>
                    {alert.impact}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] h-[18px] px-2 font-medium ${areaColorMap[alert.area]}`}>
                    {alert.area}
                  </Badge>
                </div>
                <p className="text-[13px] text-foreground leading-snug font-semibold">{alert.text}</p>
                {alert.action && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-primary/60 shrink-0" strokeWidth={2} />
                    <span>{alert.action}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
