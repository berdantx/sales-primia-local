import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Database,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Loader2,
  Activity,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function useBackupLogs() {
  return useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BackupDashboard() {
  const { data: logs, isLoading, refetch } = useBackupLogs();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const successLogs = logs?.filter(l => l.status === 'success') || [];
  const errorLogs = logs?.filter(l => l.status === 'error') || [];
  const lastSuccess = successLogs[0];
  const totalBackups = logs?.length || 0;
  const successRate = totalBackups > 0 ? Math.round((successLogs.length / totalBackups) * 100) : 0;

  const handleRetry = async () => {
    setRetryingId('retry');
    try {
      const { data, error } = await supabase.functions.invoke('export-backup', {
        body: { includeMetadata: true }
      });
      if (error) throw error;

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    } catch (err: any) {
      toast.error('Erro ao gerar backup: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setRetryingId(null);
    }
  };

  // Health check: last backup older than 7 days?
  const lastBackupDate = lastSuccess?.created_at ? new Date(lastSuccess.created_at) : null;
  const daysSinceLastBackup = lastBackupDate
    ? Math.floor((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const healthStatus = daysSinceLastBackup === null
    ? 'no-backup'
    : daysSinceLastBackup <= 7
      ? 'healthy'
      : daysSinceLastBackup <= 30
        ? 'warning'
        : 'critical';

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Database className="h-8 w-8" />
                Dashboard de Backup
              </h1>
              <p className="text-muted-foreground">Monitore e gerencie seus backups</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={handleRetry} disabled={retryingId !== null}>
                {retryingId ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Novo Backup
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Health Alert */}
        {healthStatus === 'critical' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Backup Desatualizado</AlertTitle>
            <AlertDescription>
              Seu último backup tem mais de 30 dias. Recomendamos gerar um novo backup imediatamente.
            </AlertDescription>
          </Alert>
        )}
        {healthStatus === 'warning' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Seu último backup tem mais de 7 dias. Considere gerar um novo backup.
            </AlertDescription>
          </Alert>
        )}
        {healthStatus === 'no-backup' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nenhum Backup</AlertTitle>
            <AlertDescription>
              Nenhum backup foi encontrado. Gere seu primeiro backup agora.
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Backups</p>
                  <p className="text-2xl font-bold">{totalBackups}</p>
                </div>
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold">{successRate}%</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <Progress value={successRate} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Último Backup</p>
                  <p className="text-lg font-bold">
                    {lastBackupDate
                      ? formatDistanceToNow(lastBackupDate, { addSuffix: true, locale: ptBR })
                      : 'Nunca'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saúde</p>
                  <Badge variant={
                    healthStatus === 'healthy' ? 'default' :
                    healthStatus === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {healthStatus === 'healthy' ? '✅ Saudável' :
                     healthStatus === 'warning' ? '⚠️ Atenção' :
                     healthStatus === 'critical' ? '🔴 Crítico' : '⚪ Sem dados'}
                  </Badge>
                </div>
                <ShieldCheck className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backup History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Backups</CardTitle>
            <CardDescription>Últimos 50 backups registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : logs && logs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tabelas</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sucesso
                          </Badge>
                        ) : log.status === 'error' ? (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Erro
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            {log.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.tables_included?.length || 0}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(log.total_records || 0).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatBytes(log.file_size_bytes || 0)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum backup registrado ainda
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
