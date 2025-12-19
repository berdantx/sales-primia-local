import { useState } from 'react';
import { RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFilter } from '@/contexts/FilterContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useWebhookLogs, useWebhookStats, type WebhookLogsFilters, type WebhookLog } from '@/hooks/useWebhookLogs';
import { WebhookStatusCards } from '@/components/webhook/WebhookStatusCards';
import { WebhookLogsTable } from '@/components/webhook/WebhookLogsTable';
import { WebhookFilters } from '@/components/webhook/WebhookFilters';
import { LogDetailDialog } from '@/components/webhook/LogDetailDialog';

const HOTMART_WEBHOOK_URL = 'https://vvuhqqvjtozhwideqdnn.supabase.co/functions/v1/hotmart-webhook';
const TMB_WEBHOOK_URL = 'https://vvuhqqvjtozhwideqdnn.supabase.co/functions/v1/tmb-webhook';

export default function WebhookLogs() {
  const { toast } = useToast();
  const { clientId, setClientId } = useFilter();
  const { isMaster } = useUserRole();
  const [filters, setFilters] = useState<WebhookLogsFilters>({ clientId });
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useWebhookLogs({ ...filters, clientId });
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useWebhookStats({ ...filters, clientId });

  const handleRefresh = () => {
    refetchLogs();
    refetchStats();
    toast({
      title: 'Atualizado',
      description: 'Os logs foram atualizados',
    });
  };

  const handleViewDetails = (log: WebhookLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleCopyUrl = (url: string, platform: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copiado!',
      description: `URL do webhook ${platform} copiada para a área de transferência`,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <ClientContextHeader 
            title="Webhook Logs"
            description="Monitore os eventos recebidos via webhook"
          />
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Webhook URLs */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Hotmart Webhook URL */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Webhook Hotmart</p>
                <code className="text-xs bg-background px-2 py-1 rounded border block overflow-x-auto break-all">
                  {HOTMART_WEBHOOK_URL}
                </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopyUrl(HOTMART_WEBHOOK_URL, 'Hotmart')}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href="https://developers.hotmart.com/docs/pt-BR/webhooks/webhooks-v2/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Docs
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TMB Webhook URL */}
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Webhook TMB</p>
                <code className="text-xs bg-background px-2 py-1 rounded border block overflow-x-auto break-all">
                  {TMB_WEBHOOK_URL}
                </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopyUrl(TMB_WEBHOOK_URL, 'TMB')}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards */}
        <WebhookStatusCards stats={stats} isLoading={statsLoading} />

        {/* Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Eventos</CardTitle>
            <CardDescription>
              Histórico de eventos recebidos do webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WebhookFilters filters={filters} onFiltersChange={setFilters} />
            <WebhookLogsTable
              logs={logs || []}
              isLoading={logsLoading}
              onViewDetails={handleViewDetails}
            />
          </CardContent>
        </Card>

        {/* Log Detail Dialog */}
        <LogDetailDialog
          log={selectedLog}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      </div>
    </MainLayout>
  );
}
