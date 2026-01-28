import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { EduzzTransaction } from '@/hooks/useEduzzTransactions';
import { useDeleteEduzzTransaction } from '@/hooks/useDeleteEduzzTransaction';
import { formatCurrency } from '@/lib/calculations/goalCalculations';

interface DeleteEduzzTransactionDialogProps {
  transaction: EduzzTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteEduzzTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: DeleteEduzzTransactionDialogProps) {
  const [justification, setJustification] = useState('');
  const { mutate: deleteTransaction, isPending } = useDeleteEduzzTransaction();

  const handleDelete = () => {
    if (!transaction || !justification.trim()) return;

    deleteTransaction(
      { transaction, justification: justification.trim() },
      {
        onSuccess: () => {
          setJustification('');
          onOpenChange(false);
        },
      }
    );
  };

  if (!transaction) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Transação
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Você está prestes a excluir a transação:
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>Produto:</strong> {transaction.product || 'N/A'}</p>
              <p><strong>Cliente:</strong> {transaction.buyer_name || 'N/A'}</p>
              <p><strong>Valor:</strong> {formatCurrency(transaction.sale_value, transaction.currency || 'BRL')}</p>
              <p><strong>ID:</strong> {transaction.sale_id}</p>
            </div>
            <p className="text-destructive font-medium">
              Esta ação não pode ser desfeita!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="justification" className="text-sm font-medium">
            Justificativa (obrigatória)
          </Label>
          <Textarea
            id="justification"
            placeholder="Descreva o motivo da exclusão..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || !justification.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Transação'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
