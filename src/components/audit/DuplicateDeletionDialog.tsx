import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface DuplicateDeletionRequest {
  platform: string;
  count: number;
  totalValue: number;
}

interface DuplicateDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletions: DuplicateDeletionRequest[];
  onConfirm: (justification: string) => void;
  isPending?: boolean;
}

function platformLabel(p: string) {
  return p === 'hotmart' ? 'Hotmart' : p === 'tmb' ? 'TMB' : 'Eduzz';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function DuplicateDeletionDialog({
  open,
  onOpenChange,
  deletions,
  onConfirm,
  isPending = false,
}: DuplicateDeletionDialogProps) {
  const [justification, setJustification] = useState('');

  const totalCount = deletions.reduce((s, d) => s + d.count, 0);
  const totalValue = deletions.reduce((s, d) => s + d.totalValue, 0);

  const handleConfirm = () => {
    if (!justification.trim()) return;
    onConfirm(justification.trim());
    setJustification('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setJustification('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Informe o motivo da exclusão para registro de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-md border p-3 space-y-2 bg-muted/50">
            <p className="text-sm font-medium">Resumo da exclusão:</p>
            <div className="flex flex-wrap gap-2">
              {deletions.map((d, i) => (
                <Badge key={i} variant="outline">
                  {platformLabel(d.platform)}: {d.count} registro(s)
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Total: <strong>{totalCount}</strong> registro(s) · Valor: <strong className="text-destructive">{formatCurrency(totalValue)}</strong>
            </p>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              placeholder="Descreva o motivo da exclusão..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!justification.trim() || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
