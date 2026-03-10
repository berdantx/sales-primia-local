import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Database, 
  Download, 
  Upload,
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive,
  FileJson,
  AlertTriangle,
  RotateCcw,
  Info,
  FileCode2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useClientSideBackup } from '@/hooks/useClientSideBackup';

const AVAILABLE_TABLES = [
  { id: 'transactions', name: 'Transações Hotmart', priority: 1 },
  { id: 'eduzz_transactions', name: 'Transações Eduzz', priority: 1 },
  { id: 'tmb_transactions', name: 'Transações TMB', priority: 1 },
  { id: 'clients', name: 'Clientes', priority: 1 },
  { id: 'leads', name: 'Leads', priority: 1 },
  { id: 'profiles', name: 'Perfis de Usuário', priority: 2 },
  { id: 'goals', name: 'Metas', priority: 2 },
  { id: 'goal_history', name: 'Histórico de Metas', priority: 2 },
  { id: 'invitations', name: 'Convites', priority: 2 },
  { id: 'invitation_history', name: 'Histórico de Convites', priority: 3 },
  { id: 'user_roles', name: 'Roles de Usuários', priority: 2 },
  { id: 'client_users', name: 'Usuários por Cliente', priority: 2 },
  { id: 'filter_views', name: 'Visualizações de Filtros', priority: 3 },
  { id: 'imports', name: 'Importações', priority: 3 },
  { id: 'import_errors', name: 'Erros de Importação', priority: 3 },
  { id: 'webhook_logs', name: 'Logs de Webhook', priority: 3 },
  { id: 'webhook_dispatch_logs', name: 'Logs de Dispatch', priority: 3 },
  { id: 'external_webhooks', name: 'Webhooks Externos', priority: 2 },
  { id: 'access_logs', name: 'Logs de Acesso', priority: 3 },
  { id: 'app_settings', name: 'Configurações do App', priority: 2 },
  { id: 'llm_integrations', name: 'Integrações LLM', priority: 3 },
];

interface BackupInfo {
  created_at: string;
  created_by: string;
  project: string;
  tables_included: string[];
  table_stats: Record<string, number>;
  total_records: number;
  version: string;
}

interface BackupData {
  backup_info?: BackupInfo;
  data: Record<string, any[]>;
}

export function BackupCard() {
  const { progress: backupProgress, startBackup, cancelBackup, reset: resetBackup, isExporting } = useClientSideBackup();

  // Export state
  const [selectedTables, setSelectedTables] = useState<string[]>(
    AVAILABLE_TABLES.filter(t => t.priority <= 2).map(t => t.id)
  );
  const [includeSchema, setIncludeSchema] = useState(false);
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [lastBackup, setLastBackup] = useState<{ date: string; records: number } | null>(null);

  // Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<BackupData | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace' | 'full'>('merge');
  const [restoreTables, setRestoreTables] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring' | 'success' | 'error'>('idle');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [restoreResults, setRestoreResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId)
        ? prev.filter(t => t !== tableId)
        : [...prev, tableId]
    );
  };

  const toggleRestoreTable = (tableId: string) => {
    setRestoreTables(prev => 
      prev.includes(tableId)
        ? prev.filter(t => t !== tableId)
        : [...prev, tableId]
    );
  };

  const selectAll = () => {
    setSelectedTables(AVAILABLE_TABLES.map(t => t.id));
  };

  const selectPriority = () => {
    setSelectedTables(AVAILABLE_TABLES.filter(t => t.priority <= 2).map(t => t.id));
  };

  const handleGenerateBackup = async () => {
    if (selectedTables.length === 0 && !includeSchema) {
      toast.error('Selecione pelo menos uma tabela ou inclua o schema');
      return;
    }

    setStatus('generating');

    try {
      const result = await startBackup(
        selectedTables.length > 0 ? selectedTables : [],
        includeSchema
      );

      if (result) {
        setStatus('success');
        setLastBackup({
          date: new Date().toISOString(),
          records: result.totalRecords
        });
        toast.success(`Backup gerado com sucesso! ${result.totalRecords.toLocaleString('pt-BR')} registros exportados.`);
      } else {
        if (backupProgress.status === 'cancelled') {
          setStatus('idle');
        } else {
          setStatus('error');
        }
      }
    } catch (err) {
      console.error('Backup error:', err);
      toast.error('Erro ao gerar backup');
      setStatus('error');
    } finally {
      setTimeout(() => {
        setStatus('idle');
        resetBackup();
      }, 3000);
    }
  };

  const handleSchemaOnly = async () => {
    setStatus('generating');
    try {
      const result = await startBackup([], true);
      if (result) {
        setStatus('success');
        toast.success('Schema exportado com sucesso!');
      } else {
        setStatus('error');
      }
    } catch {
      toast.error('Erro ao exportar schema');
      setStatus('error');
    } finally {
      setTimeout(() => {
        setStatus('idle');
        resetBackup();
      }, 3000);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Por favor, selecione um arquivo JSON');
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupData;

      // Validate backup structure
      if (!parsed.data || typeof parsed.data !== 'object') {
        toast.error('Arquivo de backup inválido: estrutura incorreta');
        return;
      }

      setRestoreFile(file);
      setRestoreData(parsed);
      
      // Auto-select all tables from backup
      const backupTables = Object.keys(parsed.data).filter(t => 
        AVAILABLE_TABLES.some(at => at.id === t)
      );
      setRestoreTables(backupTables);

      toast.success('Arquivo de backup carregado com sucesso');
    } catch (err) {
      console.error('Error parsing backup file:', err);
      toast.error('Erro ao ler arquivo de backup: JSON inválido');
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreData || restoreTables.length === 0) {
      toast.error('Selecione pelo menos uma tabela para restaurar');
      return;
    }

    setShowConfirmDialog(false);
    setIsRestoring(true);
    setRestoreStatus('restoring');
    setRestoreProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado');
        setRestoreStatus('error');
        return;
      }

      setRestoreProgress(30);

      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { 
          backup_data: restoreData, 
          tables: restoreTables, 
          mode: restoreMode 
        }
      });

      if (error) {
        console.error('Restore error:', error);
        toast.error('Erro ao restaurar backup: ' + error.message);
        setRestoreStatus('error');
        return;
      }

      setRestoreProgress(100);
      setRestoreStatus('success');
      setRestoreResults(data);

      if (data.success) {
        toast.success(`Backup restaurado com sucesso! ${data.total_processed} registros processados.`);
      } else {
        toast.warning(`Restauração concluída com ${data.errors?.length || 0} erros.`);
      }

    } catch (err) {
      console.error('Restore error:', err);
      toast.error('Erro ao restaurar backup');
      setRestoreStatus('error');
    } finally {
      setIsRestoring(false);
      setTimeout(() => {
        setRestoreProgress(0);
        if (restoreStatus !== 'success') {
          setRestoreStatus('idle');
        }
      }, 5000);
    }
  };

  const clearRestoreState = () => {
    setRestoreFile(null);
    setRestoreData(null);
    setRestoreTables([]);
    setRestoreResults(null);
    setRestoreStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const priorityTables = AVAILABLE_TABLES.filter(t => t.priority === 1);
  const secondaryTables = AVAILABLE_TABLES.filter(t => t.priority === 2);
  const otherTables = AVAILABLE_TABLES.filter(t => t.priority === 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup de Dados
          </CardTitle>
          <CardDescription>
            Exporte uma cópia completa dos seus dados ou restaure a partir de um backup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="export" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </TabsTrigger>
              <TabsTrigger value="restore" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Restaurar
              </TabsTrigger>
            </TabsList>

            {/* EXPORT TAB */}
            <TabsContent value="export" className="space-y-6">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Selecionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={selectPriority}>
                  Apenas Essenciais
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedTables([])}
                >
                  Limpar Seleção
                </Button>
              </div>

              {/* Table Selection */}
              <div className="space-y-4">
                {/* Priority Tables */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Badge variant="default">Dados Principais</Badge>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {priorityTables.map(table => (
                      <div key={table.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={table.id}
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                        />
                        <Label htmlFor={table.id} className="text-sm cursor-pointer">
                          {table.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secondary Tables */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Badge variant="secondary">Configurações</Badge>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {secondaryTables.map(table => (
                      <div key={table.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={table.id}
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                        />
                        <Label htmlFor={table.id} className="text-sm cursor-pointer">
                          {table.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Tables */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Badge variant="outline">Logs e Histórico</Badge>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {otherTables.map(table => (
                      <div key={table.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={table.id}
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                        />
                        <Label htmlFor={table.id} className="text-sm cursor-pointer">
                          {table.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Schema Option */}
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-muted/30">
                <Checkbox
                  id="include-schema"
                  checked={includeSchema}
                  onCheckedChange={(checked) => setIncludeSchema(!!checked)}
                />
                <Label htmlFor="include-schema" className="text-sm cursor-pointer flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-muted-foreground" />
                  Incluir estrutura do banco (tabelas, índices, RLS, funções)
                </Label>
              </div>

              {/* Progress */}
              {(isExporting || status !== 'idle') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {(isExporting || status === 'generating') && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm">
                          {backupProgress.currentTable
                            ? `Exportando ${backupProgress.currentTable} (${backupProgress.currentTableIndex}/${backupProgress.totalTables})...`
                            : 'Gerando backup...'}
                        </span>
                      </>
                    )}
                    {status === 'success' && !isExporting && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Backup gerado com sucesso!</span>
                      </>
                    )}
                    {status === 'error' && !isExporting && (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">Erro ao gerar backup</span>
                      </>
                    )}
                  </div>
                  <Progress value={backupProgress.percentage} className="h-2" />
                </div>
              )}

              {/* Last Backup Info */}
              {lastBackup && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <HardDrive className="h-4 w-4" />
                  <span>
                    Último backup: {format(new Date(lastBackup.date), 'dd/MM/yyyy HH:mm')} 
                    ({lastBackup.records.toLocaleString('pt-BR')} registros)
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleGenerateBackup}
                  disabled={isExporting || (selectedTables.length === 0 && !includeSchema)}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando Backup...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Gerar e Baixar Backup ({selectedTables.length} tabelas{includeSchema ? ' + Schema' : ''})
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSchemaOnly}
                  disabled={isExporting}
                  className="w-full"
                >
                  <FileCode2 className="h-4 w-4 mr-2" />
                  Exportar Apenas Schema
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                O arquivo JSON será baixado automaticamente. Guarde-o em local seguro.
              </p>
            </TabsContent>

            {/* RESTORE TAB */}
            <TabsContent value="restore" className="space-y-6">
              {/* File Upload */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="backup-file"
                  />
                  <label 
                    htmlFor="backup-file" 
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <FileJson className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {restoreFile ? restoreFile.name : 'Clique para selecionar um arquivo de backup (.json)'}
                    </span>
                  </label>
                </div>

                {restoreFile && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearRestoreState}
                  >
                    Limpar Seleção
                  </Button>
                )}
              </div>

              {/* Backup Preview */}
              <AnimatePresence>
                {restoreData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Backup Info */}
                    {restoreData.backup_info && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Informações do Backup</AlertTitle>
                        <AlertDescription className="mt-2 space-y-1 text-sm">
                          <p><strong>Data:</strong> {format(new Date(restoreData.backup_info.created_at), 'dd/MM/yyyy HH:mm')}</p>
                          <p><strong>Criado por:</strong> {restoreData.backup_info.created_by}</p>
                          <p><strong>Total de registros:</strong> {restoreData.backup_info.total_records.toLocaleString('pt-BR')}</p>
                          <p><strong>Tabelas:</strong> {restoreData.backup_info.tables_included.length}</p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Restore Mode */}
                    <div className="space-y-2">
                      <Label>Modo de Restauração</Label>
                      <Select 
                        value={restoreMode} 
                        onValueChange={(v) => setRestoreMode(v as typeof restoreMode)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="merge">
                            <div className="flex flex-col">
                              <span>Merge (Mesclar)</span>
                              <span className="text-xs text-muted-foreground">Adiciona apenas registros novos</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="replace">
                            <div className="flex flex-col">
                              <span>Replace (Substituir)</span>
                              <span className="text-xs text-muted-foreground">Atualiza registros existentes</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="full">
                            <div className="flex flex-col">
                              <span>Full (Completo)</span>
                              <span className="text-xs text-muted-foreground">⚠️ Limpa tabelas antes de restaurar</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Warning for Full mode */}
                    {restoreMode === 'full' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Atenção!</AlertTitle>
                        <AlertDescription>
                          O modo FULL irá apagar todos os dados existentes nas tabelas selecionadas 
                          antes de restaurar. Esta ação não pode ser desfeita.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Table Selection for Restore */}
                    <div className="space-y-2">
                      <Label>Tabelas para Restaurar</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg">
                        {Object.keys(restoreData.data)
                          .filter(t => AVAILABLE_TABLES.some(at => at.id === t))
                          .map(tableId => {
                            const tableInfo = AVAILABLE_TABLES.find(t => t.id === tableId);
                            const recordCount = restoreData.data[tableId]?.length || 0;
                            
                            return (
                              <div key={tableId} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`restore-${tableId}`}
                                  checked={restoreTables.includes(tableId)}
                                  onCheckedChange={() => toggleRestoreTable(tableId)}
                                />
                                <Label 
                                  htmlFor={`restore-${tableId}`} 
                                  className="text-sm cursor-pointer"
                                >
                                  {tableInfo?.name || tableId}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({recordCount})
                                  </span>
                                </Label>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Progress */}
                    {restoreStatus !== 'idle' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {restoreStatus === 'restoring' && (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <span className="text-sm">Restaurando backup...</span>
                            </>
                          )}
                          {restoreStatus === 'success' && (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600">Backup restaurado!</span>
                            </>
                          )}
                          {restoreStatus === 'error' && (
                            <>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-sm text-destructive">Erro na restauração</span>
                            </>
                          )}
                        </div>
                        <Progress value={restoreProgress} className="h-2" />
                      </div>
                    )}

                    {/* Restore Results */}
                    {restoreResults && (
                      <Alert variant={restoreResults.success ? 'default' : 'destructive'}>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Resultado da Restauração</AlertTitle>
                        <AlertDescription className="mt-2">
                          <p className="text-sm">
                            <strong>{restoreResults.total_processed}</strong> registros processados 
                            em <strong>{restoreResults.tables_restored?.length}</strong> tabelas
                          </p>
                          {restoreResults.errors?.length > 0 && (
                            <div className="mt-2 text-xs text-destructive max-h-20 overflow-y-auto">
                              {restoreResults.errors.slice(0, 5).map((err: string, i: number) => (
                                <p key={i}>• {err}</p>
                              ))}
                              {restoreResults.errors.length > 5 && (
                                <p>... e mais {restoreResults.errors.length - 5} erros</p>
                              )}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Restore Button */}
                    <Button 
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={isRestoring || restoreTables.length === 0}
                      className="w-full"
                      variant={restoreMode === 'full' ? 'destructive' : 'default'}
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Restaurando...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar Backup ({restoreTables.length} tabelas)
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!restoreData && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecione um arquivo de backup para ver as opções de restauração
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {restoreMode === 'full' ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <RotateCcw className="h-5 w-5" />
              )}
              Confirmar Restauração
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a restaurar <strong>{restoreTables.length}</strong> tabelas 
                no modo <strong>{restoreMode.toUpperCase()}</strong>.
              </p>
              {restoreMode === 'full' && (
                <p className="text-destructive font-medium">
                  ⚠️ ATENÇÃO: Todos os dados existentes nas tabelas selecionadas serão APAGADOS!
                </p>
              )}
              <p>Deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreBackup}
              className={restoreMode === 'full' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {restoreMode === 'full' ? 'Sim, Apagar e Restaurar' : 'Confirmar Restauração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
