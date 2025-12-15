import { useState, useEffect } from 'react';
import { Trash2, Database, FileText, AlertTriangle, Store, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DataStats {
  hotmartTransactions: number;
  tmbTransactions: number;
  imports: number;
}

export function DataManagement() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DataStats>({ hotmartTransactions: 0, tmbTransactions: 0, imports: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStats = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [hotmartResult, tmbResult, importsResult] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('tmb_transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('imports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({
        hotmartTransactions: hotmartResult.count || 0,
        tmbTransactions: tmbResult.count || 0,
        imports: importsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleClearAllData = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Get all import IDs for this user first
      const { data: imports } = await supabase
        .from('imports')
        .select('id')
        .eq('user_id', user.id);

      const importIds = imports?.map(i => i.id) || [];

      // Delete import errors for user's imports
      if (importIds.length > 0) {
        await supabase
          .from('import_errors')
          .delete()
          .in('import_id', importIds);
      }

      // Delete all transactions (Hotmart)
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      // Delete all TMB transactions
      await supabase
        .from('tmb_transactions')
        .delete()
        .eq('user_id', user.id);

      // Delete all imports
      await supabase
        .from('imports')
        .delete()
        .eq('user_id', user.id);

      toast.success('Todos os dados foram removidos com sucesso!');
      fetchStats();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Erro ao remover dados. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalTransactions = stats.hotmartTransactions + stats.tmbTransactions;

  if (totalTransactions === 0 && stats.imports === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" />
          Dados Importados
        </CardTitle>
        <CardDescription>
          Gerencie os dados já importados no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            {stats.hotmartTransactions > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Hotmart:</span>
                <Badge variant="secondary" className="font-semibold">
                  {isLoading ? '...' : stats.hotmartTransactions.toLocaleString('pt-BR')}
                </Badge>
              </div>
            )}
            {stats.tmbTransactions > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-success/5 rounded-lg">
                <Store className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">TMB:</span>
                <Badge variant="secondary" className="font-semibold bg-success/10">
                  {isLoading ? '...' : stats.tmbTransactions.toLocaleString('pt-BR')}
                </Badge>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Importações:</span>
              <Badge variant="outline" className="font-semibold">
                {isLoading ? '...' : stats.imports.toLocaleString('pt-BR')}
              </Badge>
            </div>
          </div>

          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isLoading || isDeleting || (totalTransactions === 0 && stats.imports === 0)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Todos os Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmar exclusão
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      Você está prestes a excluir:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {stats.hotmartTransactions > 0 && (
                        <li><strong>{stats.hotmartTransactions.toLocaleString('pt-BR')}</strong> transações Hotmart</li>
                      )}
                      {stats.tmbTransactions > 0 && (
                        <li><strong>{stats.tmbTransactions.toLocaleString('pt-BR')}</strong> transações TMB</li>
                      )}
                      <li><strong>{stats.imports}</strong> registros de importação</li>
                    </ul>
                    <p className="text-destructive font-medium">
                      Esta ação é irreversível!
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Excluindo...' : 'Sim, excluir tudo'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
