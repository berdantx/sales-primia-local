import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useCurrencyAlerts } from '@/hooks/useCurrencyAlerts';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const ALERT_TYPE_CONFIG = {
  failed_conversion: {
    label: 'Conversão falhou',
    icon: XCircle,
    color: 'text-destructive',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  unknown_currency: {
    label: 'Moeda desconhecida',
    icon: AlertTriangle,
    color: 'text-orange-500',
    badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
  fallback_used: {
    label: 'Taxa estática',
    icon: Info,
    color: 'text-yellow-500',
    badgeClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
};

export function CurrencyAlertsCard() {
  const { alerts, alertsByType, isLoading, resolveAlert, totalPending } = useCurrencyAlerts();

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert.mutateAsync(alertId);
      toast({ title: 'Alerta resolvido', description: 'O alerta foi marcado como resolvido.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível resolver o alerta.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Conversão
            {totalPending > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalPending}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {totalPending === 0
              ? 'Nenhum alerta pendente de conversão de moeda'
              : `${totalPending} alerta${totalPending !== 1 ? 's' : ''} pendente${totalPending !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>

        {totalPending > 0 && (
          <CardContent className="space-y-4">
            {/* Summary by type */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(alertsByType).map(([type, items]) => {
                if (items.length === 0) return null;
                const config = ALERT_TYPE_CONFIG[type as keyof typeof ALERT_TYPE_CONFIG];
                return (
                  <Badge key={type} variant="outline" className={config.badgeClass}>
                    <config.icon className="h-3 w-3 mr-1" />
                    {config.label}: {items.length}
                  </Badge>
                );
              })}
            </div>

            {/* Alert list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {alerts.slice(0, 20).map((alert) => {
                const config = ALERT_TYPE_CONFIG[alert.alert_type as keyof typeof ALERT_TYPE_CONFIG] || ALERT_TYPE_CONFIG.failed_conversion;
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                        <span className="font-mono text-sm">{alert.original_currency}</span>
                        <Badge variant="outline" className="text-xs">
                          {alert.platform}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {alert.original_value} {alert.original_currency} → {alert.converted_value} USD
                        {alert.conversion_source !== 'none' && ` (${alert.conversion_source})`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolveAlert.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
