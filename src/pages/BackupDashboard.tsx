import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Database,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Activity,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClientSideBackup, BACKUP_TABLES } from '@/hooks/useClientSideBackup';

const TABLE_CATEGORIES: { label: string; tables: string[] }[] = [
  { label: 'Dados Principais', tables: ['transactions', 'eduzz_transactions', 'tmb_transactions', 'leads'] },
  { label: 'Configuração', tables: ['clients', 'profiles', 'client_users', 'goals', 'goal_history', 'filter_views', 'app_settings', 'llm_integrations', 'external_webhooks'] },
  { label: 'Importação/Exportação', tables: ['imports', 'import_errors', 'export_jobs', 'backup_logs'] },
  { label: 'Convites', tables: ['invitations', 'invitation_history'] },
  { label: 'Logs/Auditoria', tables: ['access_logs', 'lead_deletion_logs', 'duplicate_deletion_logs', 'eduzz_transaction_deletion_logs', 'permission_audit_logs'] },
  { label: 'Outros', tables: ['known_landing_pages', 'interest_leads'] },
];

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
  const queryClient = useQueryClient();
  const { progress, startBackup, cancelBackup, reset, isExporting } = useClientSideBackup();

  const [selectedTables, setSelectedTables] = useState<Set<string>>(
    () => new Set(BACKUP_TABLES as readonly string[])
  );
  const [includeSchema, setIncludeSchema] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(true);

  const toggleTable = (table: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      return next;
    });
  };

  const toggleCategory = (tables: string[]) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      const allSelected = tables.every(t => next.has(t));
      tables.forEach(t => allSelected ? next.delete(t) : next.add(t));
      return next;
    });
  };

  const selectAll = () => setSelectedTables(new Set(BACKUP_TABLES as readonly string[]));
  const deselectAll = () => setSelectedTables(new Set());

  const successLogs = logs?.filter(l => l.status === 'success') || [];
  const totalBackups = logs?.length || 0;
  const successRate = totalBackups > 0 ? Math.round((successLogs.length / totalBackups) * 100) : 0;
  const lastSuccess = successLogs[0];

  const handleBackup = async () => {
    reset();
    const result = await startBackup(Array.from(selectedTables), includeSchema);
    if (result) {
      toast.success(`Backup concluído! ${result.totalRecords.toLocaleString('pt-BR')} registros em ${(result.durationMs / 1000).toFixed(1)}s`);
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    } else if (progress.status === 'cancelled') {
      toast.info('Backup cancelado.');
    }
  };

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
              {isExporting ? (
                <Button variant="destructive" onClick={cancelBackup}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              ) : (
                <Button onClick={handleBackup} disabled={isExporting || selectedTables.size === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Novo Backup
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Table Selector */}
        <Card>
          <Collapsible open={selectorOpen} onOpenChange={setSelectorOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Selecionar Tabelas</CardTitle>
                  <Badge variant="secondary">
                    {selectedTables.size} de {BACKUP_TABLES.length}
                  </Badge>
                </div>
                {selectorOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>Selecionar Todas</Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>Desmarcar Todas</Button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 bg-muted/50">
                    <Checkbox
                      checked={includeSchema}
                      onCheckedChange={(checked) => setIncludeSchema(checked === true)}
                    />
                    <div className="text-sm">
                      <span className="font-medium">Incluir estrutura do banco</span>
                      <span className="text-muted-foreground ml-1">(tabelas, índices, RLS, funções)</span>
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TABLE_CATEGORIES.map(cat => {
                    const allSelected = cat.tables.every(t => selectedTables.has(t));
                    const someSelected = cat.tables.some(t => selectedTables.has(t));
                    return (
                      <div key={cat.label} className="space-y-2 border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                            onCheckedChange={() => toggleCategory(cat.tables)}
                          />
                          <span className="font-medium text-sm">{cat.label}</span>
                        </div>
                        <div className="ml-6 space-y-1">
                          {cat.tables.map(table => (
                            <label key={table} className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                              <Checkbox
                                checked={selectedTables.has(table)}
                                onCheckedChange={() => toggleTable(table)}
                              />
                              {table}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Export Progress */}
        {(progress.status !== 'idle') && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              {progress.status === 'schema' && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando estrutura do banco de dados...
                </div>
              )}
              {progress.status === 'exporting' && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exportando <strong>{progress.currentTable}</strong>
                      <span className="text-muted-foreground">
                        ({progress.currentTableIndex}/{progress.totalTables} tabelas)
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {progress.currentTableRecords.toLocaleString('pt-BR')} registros nesta tabela
                    </span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {progress.totalRecords.toLocaleString('pt-BR')} registros total • {progress.percentage}%
                  </p>
                </>
              )}
              {progress.status === 'generating' && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando arquivo JSON... ({progress.totalRecords.toLocaleString('pt-BR')} registros)
                </div>
              )}
              {progress.status === 'complete' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Backup concluído com {progress.totalRecords.toLocaleString('pt-BR')} registros
                </div>
              )}
              {progress.status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Erro: {progress.error}
                </div>
              )}
              {progress.status === 'cancelled' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  Backup cancelado pelo usuário
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
