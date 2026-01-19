import { useState, useMemo } from 'react';
import { RefreshCw, Copy, ExternalLink, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { WebhookDailyChart } from '@/components/webhook/WebhookDailyChart';
import { DuplicatesReportCard } from '@/components/webhook/DuplicatesReportCard';
import { WebhookHealthDashboard } from '@/components/webhook/WebhookHealthDashboard';
import { ValidationAlertsCard } from '@/components/webhook/ValidationAlertsCard';
import { ValidationTrendChart } from '@/components/webhook/ValidationTrendChart';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BASE_URL = 'https://vvuhqqvjtozhwideqdnn.supabase.co/functions/v1';
const ITEMS_PER_PAGE = 50;

export default function WebhookLogs() {
  const { toast } = useToast();
  const { clientId, setClientId } = useFilter();
  const { isMaster } = useUserRole();
  const [filters, setFilters] = useState<WebhookLogsFilters>({ clientId });
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useWebhookLogs({ ...filters, clientId });
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useWebhookStats({ ...filters, clientId });

  // Pagination
  const totalItems = logs?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    if (!logs) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return logs.slice(start, start + ITEMS_PER_PAGE);
  }, [logs, currentPage]);

  // Reset page when filters change
  const handleFiltersChange = (newFilters: WebhookLogsFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Generate client-specific webhook URLs
  const webhookUrls = useMemo(() => {
    const clientParam = clientId ? `?client_id=${clientId}` : '';
    return {
      hotmart: `${BASE_URL}/hotmart-webhook${clientParam}`,
      tmb: `${BASE_URL}/tmb-webhook${clientParam}`,
      eduzz: `${BASE_URL}/eduzz-webhook${clientParam}`,
    };
  }, [clientId]);

  const handleRefresh = () => {
    refetchLogs();
    refetchStats();
    setCurrentPage(1);
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

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast({
        title: 'Sem dados',
        description: 'Não há logs para exportar',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Data/Hora', 'Tipo', 'Código', 'Status', 'Mensagem de Erro'];
    const csvContent = [
      headers.join(','),
      ...logs.map((log) => [
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        log.event_type,
        log.transaction_code || '',
        log.status,
        log.error_message?.replace(/,/g, ';') || '',
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `webhook-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();

    toast({
      title: 'Exportado!',
      description: `${logs.length} logs exportados para CSV`,
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

        {/* Warning when no client selected */}
        {!clientId && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Selecione um cliente no topo da página para obter a URL específica do webhook. 
              Sem o parâmetro client_id, as transações serão associadas ao cliente padrão.
            </AlertDescription>
          </Alert>
        )}

        {/* Webhook URLs */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Hotmart Webhook URL */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Webhook Hotmart</p>
                <code className="text-xs bg-background px-2 py-1 rounded border block overflow-x-auto break-all">
                  {webhookUrls.hotmart}
                </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopyUrl(webhookUrls.hotmart, 'Hotmart')}>
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
                  {webhookUrls.tmb}
                </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopyUrl(webhookUrls.tmb, 'TMB')}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eduzz Webhook URL */}
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Webhook Eduzz</p>
                <code className="text-xs bg-background px-2 py-1 rounded border block overflow-x-auto break-all">
                  {webhookUrls.eduzz}
                </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopyUrl(webhookUrls.eduzz, 'Eduzz')}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href="https://developers.eduzz.com/reference/introducao-webhook"
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
        </div>

        {/* Status Cards */}
        <WebhookStatusCards stats={stats} isLoading={statsLoading} />

        {/* Charts Section */}
        <div className="grid gap-4 lg:grid-cols-2">
          <WebhookDailyChart logs={logs} isLoading={logsLoading} />
          <WebhookHealthDashboard logs={logs} isLoading={logsLoading} />
        </div>

        {/* Validation Alerts Section */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ValidationAlertsCard 
            logs={logs} 
            isLoading={logsLoading} 
            onViewDetails={handleViewDetails} 
          />
          <ValidationTrendChart logs={logs} isLoading={logsLoading} />
        </div>

        {/* Duplicates Report */}
        <DuplicatesReportCard logs={logs} isLoading={logsLoading} />

        {/* Logs Section */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Logs de Eventos</CardTitle>
              <CardDescription>
                Histórico de eventos recebidos do webhook
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={!logs || logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <WebhookFilters filters={filters} onFiltersChange={handleFiltersChange} />
            <WebhookLogsTable
              logs={paginatedLogs}
              isLoading={logsLoading}
              onViewDetails={handleViewDetails}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={totalItems}
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
