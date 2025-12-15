import { Card, CardContent } from '@/components/ui/card';
import { Inbox, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import type { WebhookStats } from '@/hooks/useWebhookLogs';

interface WebhookStatusCardsProps {
  stats: WebhookStats | undefined;
  isLoading: boolean;
}

export function WebhookStatusCards({ stats, isLoading }: WebhookStatusCardsProps) {
  const cards = [
    {
      title: 'Total Recebido',
      value: stats?.total || 0,
      icon: Inbox,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Processados',
      value: stats?.processed || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Ignorados',
      value: stats?.skipped || 0,
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Erros',
      value: stats?.errors || 0,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                ) : (
                  <p className="text-lg sm:text-2xl font-bold">{card.value}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
