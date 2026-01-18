import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Download, Loader2, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export function BackupCard() {
  const [selectedTables, setSelectedTables] = useState<string[]>(
    AVAILABLE_TABLES.filter(t => t.priority <= 2).map(t => t.id)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [lastBackup, setLastBackup] = useState<{ date: string; records: number } | null>(null);

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => 
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
    if (selectedTables.length === 0) {
      toast.error('Selecione pelo menos uma tabela');
      return;
    }

    setIsGenerating(true);
    setStatus('generating');
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado');
        setStatus('error');
        return;
      }

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('export-backup', {
        body: { tables: selectedTables, includeMetadata: true }
      });

      if (error) {
        console.error('Backup error:', error);
        toast.error('Erro ao gerar backup: ' + error.message);
        setStatus('error');
        return;
      }

      setProgress(80);

      // Create and download the file
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `analyzeflow_backup_${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus('success');
      setLastBackup({
        date: new Date().toISOString(),
        records: data.backup_info?.total_records || 0
      });

      toast.success(`Backup gerado com sucesso! ${data.backup_info?.total_records || 0} registros exportados.`);

    } catch (err) {
      console.error('Backup error:', err);
      toast.error('Erro ao gerar backup');
      setStatus('error');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setProgress(0);
        setStatus('idle');
      }, 3000);
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
            Exporte uma cópia completa dos seus dados em formato JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Progress */}
          {status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status === 'generating' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Gerando backup...</span>
                  </>
                )}
                {status === 'success' && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Backup gerado com sucesso!</span>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Erro ao gerar backup</span>
                  </>
                )}
              </div>
              <Progress value={progress} className="h-2" />
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

          {/* Generate Button */}
          <Button 
            onClick={handleGenerateBackup}
            disabled={isGenerating || selectedTables.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando Backup...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Gerar e Baixar Backup ({selectedTables.length} tabelas)
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            O arquivo JSON será baixado automaticamente. Guarde-o em local seguro.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
