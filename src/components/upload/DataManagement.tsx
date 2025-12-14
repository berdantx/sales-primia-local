import { useState, useEffect } from 'react';
import { Trash2, Database, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  transactions: number;
  imports: number;
}

export function DataManagement() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DataStats>({ transactions: 0, imports: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStats = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [transactionsResult, importsResult] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('imports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({
        transactions: transactionsResult.count || 0,
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

      // Delete all transactions
      await supabase
        .from('transactions')
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

  if (stats.transactions === 0 && stats.imports === 0 && !isLoading) {
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
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Transações:</span>
              <span className="font-semibold">
                {isLoading ? '...' : stats.transactions.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Importações:</span>
              <span className="font-semibold">
                {isLoading ? '...' : stats.imports.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                disabled={isLoading || isDeleting || (stats.transactions === 0 && stats.imports === 0)}
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
                <AlertDialogDescription className="space-y-2">
                  <p>
                    Você está prestes a excluir <strong>todas as {stats.transactions.toLocaleString('pt-BR')} transações</strong> e 
                    <strong> {stats.imports} importações</strong>.
                  </p>
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
      </CardContent>
    </Card>
  );
}
