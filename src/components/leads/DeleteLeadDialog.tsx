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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';

interface DeleteLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (justification: string) => Promise<void>;
  isDeleting: boolean;
}

export function DeleteLeadDialog({
  lead,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteLeadDialogProps) {
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    const trimmed = justification.trim();
    if (trimmed.length < 10) {
      setError('A justificativa deve ter pelo menos 10 caracteres.');
      return;
    }
    setError('');
    await onConfirm(trimmed);
    setJustification('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setJustification('');
      setError('');
    }
    onOpenChange(open);
  };

  if (!lead) return null;

  const leadName = lead.first_name || lead.last_name 
    ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    : lead.email;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Lead
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a excluir permanentemente o lead:
            </p>
            <p className="font-medium text-foreground">
              {leadName}
            </p>
            <p className="text-sm">
              Esta ação não pode ser desfeita. Os dados serão arquivados para auditoria.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="justification" className="text-sm font-medium">
            Justificativa <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="justification"
            placeholder="Descreva o motivo da exclusão deste lead (mínimo 10 caracteres)..."
            value={justification}
            onChange={(e) => {
              setJustification(e.target.value);
              if (error) setError('');
            }}
            className="min-h-[100px] resize-none"
            disabled={isDeleting}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            A justificativa será registrada no histórico de auditoria.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isDeleting || justification.trim().length < 10}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Lead'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
