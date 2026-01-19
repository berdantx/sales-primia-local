import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface WebhookHealthDashboardProps {
  logs: WebhookLog[] | undefined;
  isLoading: boolean;
}

interface PlatformHealth {
  platform: string;
  total: number;
  processed: number;
  duplicates: number;
  errors: number;
  skipped: number;
  successRate: number;
  status: 'healthy' | 'warning' | 'critical';
  color: string;
}

function getHealthStatus(successRate: number, errorRate: number): 'healthy' | 'warning' | 'critical' {
  if (errorRate > 10) return 'critical';
  if (successRate < 80 || errorRate > 5) return 'warning';
  return 'healthy';
}

function StatusIcon({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-500" />;
  }
}

function StatusBadge({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const config = {
    healthy: { label: 'Saudável', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    warning: { label: 'Atenção', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    critical: { label: 'Crítico', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };

  return (
    <Badge variant="outline" className={config[status].className}>
      {config[status].label}
    </Badge>
  );
}

export function WebhookHealthDashboard({ logs, isLoading }: WebhookHealthDashboardProps) {
  const platformsHealth = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const platforms = [
      { 
        name: 'Hotmart', 
        filter: (log: WebhookLog) => log.event_type.includes('PURCHASE'),
        color: 'blue' 
      },
      { 
        name: 'TMB', 
        filter: (log: WebhookLog) => log.event_type.toLowerCase().startsWith('tmb_'),
        color: 'orange' 
      },
      { 
        name: 'Eduzz', 
        filter: (log: WebhookLog) => log.event_type.toLowerCase().startsWith('eduzz_'),
        color: 'purple' 
      },
    ];

    return platforms.map((platform) => {
      const platformLogs = logs.filter(platform.filter);
      const total = platformLogs.length;
      
      if (total === 0) {
        return {
          platform: platform.name,
          total: 0,
          processed: 0,
          duplicates: 0,
          errors: 0,
          skipped: 0,
          successRate: 100,
          status: 'healthy' as const,
          color: platform.color,
        };
      }

      const processed = platformLogs.filter(l => l.status === 'processed').length;
      const duplicates = platformLogs.filter(l => l.status === 'duplicate').length;
      const errors = platformLogs.filter(l => l.status === 'error').length;
      const skipped = platformLogs.filter(l => l.status === 'skipped').length;
      
      const successRate = ((processed + duplicates + skipped) / total) * 100;
      const errorRate = (errors / total) * 100;

      return {
        platform: platform.name,
        total,
        processed,
        duplicates,
        errors,
        skipped,
        successRate,
        status: getHealthStatus(successRate, errorRate),
        color: platform.color,
      };
    }).filter(p => p.total > 0);
  }, [logs]);

  const overallHealth = useMemo(() => {
    if (platformsHealth.length === 0) return { status: 'healthy' as const, successRate: 100, totalLogs: 0 };
    
    const totalLogs = platformsHealth.reduce((sum, p) => sum + p.total, 0);
    const totalErrors = platformsHealth.reduce((sum, p) => sum + p.errors, 0);
    const totalProcessed = platformsHealth.reduce((sum, p) => sum + p.processed + p.duplicates + p.skipped, 0);
    
    const successRate = totalLogs > 0 ? (totalProcessed / totalLogs) * 100 : 100;
    const errorRate = totalLogs > 0 ? (totalErrors / totalLogs) * 100 : 0;

    return {
      status: getHealthStatus(successRate, errorRate),
      successRate,
      totalLogs,
    };
  }, [platformsHealth]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Saúde dos Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Saúde dos Webhooks
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusIcon status={overallHealth.status} />
            <StatusBadge status={overallHealth.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Stats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm text-muted-foreground">Taxa de Sucesso Geral</p>
            <p className="text-2xl font-bold">{overallHealth.successRate.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total de Logs</p>
            <p className="text-2xl font-bold">{overallHealth.totalLogs}</p>
          </div>
        </div>

        {/* Per Platform Health */}
        {platformsHealth.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum webhook registrado no período
          </div>
        ) : (
          <div className="space-y-4">
            {platformsHealth.map((platform) => {
              const colorClasses: Record<string, string> = {
                blue: 'bg-blue-500',
                orange: 'bg-orange-500',
                purple: 'bg-purple-500',
              };

              return (
                <div key={platform.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClasses[platform.color]}`} />
                      <span className="font-medium text-sm">{platform.platform}</span>
                      <StatusIcon status={platform.status} />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {platform.successRate.toFixed(1)}% sucesso
                    </span>
                  </div>
                  
                  <Progress 
                    value={platform.successRate} 
                    className="h-2"
                  />
                  
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-600">✓ {platform.processed} processados</span>
                    <span className="text-purple-600">⧉ {platform.duplicates} duplicatas</span>
                    <span className="text-amber-600">○ {platform.skipped} ignorados</span>
                    <span className="text-red-600">✕ {platform.errors} erros</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
