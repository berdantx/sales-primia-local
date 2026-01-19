import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface DuplicatesReportCardProps {
  logs: WebhookLog[] | undefined;
  isLoading: boolean;
}

interface PlatformDuplicates {
  platform: string;
  count: number;
  color: string;
  bgColor: string;
}

export function DuplicatesReportCard({ logs, isLoading }: DuplicatesReportCardProps) {
  const duplicatesData = useMemo(() => {
    if (!logs) return { platforms: [], total: 0 };

    const duplicateLogs = logs.filter((log) => log.status === 'duplicate');
    
    // Group by platform
    const hotmartCount = duplicateLogs.filter((log) => 
      log.event_type.includes('PURCHASE')
    ).length;
    
    const tmbCount = duplicateLogs.filter((log) => 
      log.event_type.toLowerCase().startsWith('tmb_')
    ).length;
    
    const eduzzCount = duplicateLogs.filter((log) => 
      log.event_type.toLowerCase().startsWith('eduzz_')
    ).length;

    const platforms: PlatformDuplicates[] = [
      { platform: 'Hotmart', count: hotmartCount, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
      { platform: 'TMB', count: tmbCount, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
      { platform: 'Eduzz', count: eduzzCount, color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
    ].filter((p) => p.count > 0);

    return {
      platforms,
      total: duplicateLogs.length,
    };
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Copy className="h-4 w-4 text-purple-500" />
            Duplicatas por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (duplicatesData.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Copy className="h-4 w-4 text-purple-500" />
            Duplicatas por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Nenhuma duplicata detectada no período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Copy className="h-4 w-4 text-purple-500" />
          Duplicatas por Plataforma
          <Badge variant="secondary" className="ml-auto">
            {duplicatesData.total} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {duplicatesData.platforms.map((platform) => (
            <div key={platform.platform} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${platform.bgColor.replace('/10', '')}`} />
                <span className="text-sm font-medium">{platform.platform}</span>
              </div>
              <Badge variant="outline" className={`${platform.bgColor} ${platform.color} border-0`}>
                {platform.count} duplicatas
              </Badge>
            </div>
          ))}
          
          {/* Percentage bar */}
          <div className="mt-4 pt-3 border-t">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              {duplicatesData.platforms.map((platform, idx) => {
                const percentage = (platform.count / duplicatesData.total) * 100;
                const colors: Record<string, string> = {
                  'Hotmart': 'bg-blue-500',
                  'TMB': 'bg-orange-500',
                  'Eduzz': 'bg-purple-500',
                };
                return (
                  <div
                    key={platform.platform}
                    className={`${colors[platform.platform]} transition-all`}
                    style={{ width: `${percentage}%` }}
                    title={`${platform.platform}: ${percentage.toFixed(1)}%`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              {duplicatesData.platforms.map((platform) => (
                <span key={platform.platform}>
                  {platform.platform}: {((platform.count / duplicatesData.total) * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
