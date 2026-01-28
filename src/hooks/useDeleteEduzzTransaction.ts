import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { EduzzTransaction } from '@/hooks/useEduzzTransactions';

interface DeleteTransactionParams {
  transaction: EduzzTransaction;
  justification: string;
}

export function useDeleteEduzzTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transaction, justification }: DeleteTransactionParams) => {
      if (!user) throw new Error('Usuário não autenticado');

      // First, log the deletion (using any to bypass type restrictions for new table)
      const logData = {
        transaction_id: transaction.id,
        sale_id: transaction.sale_id,
        client_id: transaction.client_id || '00000000-0000-0000-0000-000000000000',
        deleted_by: user.id,
        justification,
        transaction_data: transaction as unknown as Record<string, unknown>,
      };
      
      const { error: logError } = await supabase
        .from('eduzz_transaction_deletion_logs' as 'eduzz_transactions')
        .insert(logData as any);

      if (logError) {
        console.error('Error logging deletion:', logError);
        throw new Error('Erro ao registrar exclusão: ' + logError.message);
      }

      // Then delete the transaction
      const { error: deleteError } = await supabase
        .from('eduzz_transactions')
        .delete()
        .eq('id', transaction.id);

      if (deleteError) {
        console.error('Error deleting transaction:', deleteError);
        throw new Error('Erro ao excluir transação: ' + deleteError.message);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Transação excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['eduzz-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['eduzz-transaction-stats'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
