import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ArrowRight, SkipForward, GitMerge, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface DuplicateMatch {
  id: string; // transaction_code / order_id / sale_id
  csvData: Record<string, unknown>;
  existingData: Record<string, unknown>;
  emptyFieldsInExisting: string[]; // fields that are null/empty in DB but have values in CSV
}

export type DuplicateAction = 'skip' | 'merge';

interface DuplicateReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateMatch[];
  newCount: number;
  platform: 'hotmart' | 'tmb' | 'eduzz';
  onConfirm: (action: DuplicateAction) => void;
  isProcessing?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  buyer_name: 'Nome',
  buyer_email: 'Email',
  buyer_phone: 'Telefone',
  product: 'Produto',
  product_id: 'ID Produto',
  sck_code: 'SCK',
  payment_method: 'Pagamento',
  billing_type: 'Tipo Cobrança',
  country: 'País',
  utm_source: 'UTM Source',
  utm_medium: 'UTM Medium',
  utm_campaign: 'UTM Campaign',
  utm_content: 'UTM Content',
  invoice_code: 'Código NF',
};

export function DuplicateReviewDialog({
  open,
  onOpenChange,
  duplicates,
  newCount,
  platform,
  onConfirm,
  isProcessing = false,
}: DuplicateReviewDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  const mergeableDuplicates = duplicates.filter(d => d.emptyFieldsInExisting.length > 0);
  const totalFieldsToFill = mergeableDuplicates.reduce((sum, d) => sum + d.emptyFieldsInExisting.length, 0);

  const platformLabel = platform === 'hotmart' ? 'Hotmart' : platform === 'tmb' ? 'TMB' : 'Eduzz';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Duplicatas encontradas
          </DialogTitle>
          <DialogDescription>
            {duplicates.length} transações do CSV já existem no banco ({platformLabel}).
            Escolha como deseja prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-primary/5 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{newCount}</p>
              <p className="text-xs text-muted-foreground">Novas (serão importadas)</p>
            </div>
            <div className="rounded-lg border bg-warning/5 p-3 text-center">
              <p className="text-2xl font-bold text-warning">{duplicates.length}</p>
              <p className="text-xs text-muted-foreground">Duplicatas</p>
            </div>
            <div className="rounded-lg border bg-accent/50 p-3 text-center">
              <p className="text-2xl font-bold">{mergeableDuplicates.length}</p>
              <p className="text-xs text-muted-foreground">Com campos preenchíveis</p>
            </div>
          </div>

          {/* Merge info */}
          {mergeableDuplicates.length > 0 && (
            <div className="rounded-lg border bg-accent/30 p-3">
              <p className="text-sm">
                <GitMerge className="inline h-4 w-4 mr-1 text-primary" />
                <strong>Mesclar</strong> preencherá <strong>{totalFieldsToFill} campos vazios</strong> em{' '}
                {mergeableDuplicates.length} registros existentes com dados do CSV, sem sobrescrever dados já preenchidos.
              </p>
            </div>
          )}

          {/* Expandable details */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2">
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showDetails ? 'Ocultar detalhes' : 'Ver detalhes das duplicatas'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-[250px] mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Campos preenchíveis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicates.slice(0, 50).map((dup) => (
                      <TableRow key={dup.id}>
                        <TableCell className="font-mono text-xs">
                          {dup.id.length > 16 ? `${dup.id.slice(0, 16)}...` : dup.id}
                        </TableCell>
                        <TableCell>
                          {dup.emptyFieldsInExisting.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {dup.emptyFieldsInExisting.map(f => (
                                <Badge key={f} variant="secondary" className="text-xs">
                                  {FIELD_LABELS[f] || f}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nenhum campo vazio</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {duplicates.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground text-sm">
                          +{duplicates.length - 50} duplicatas não exibidas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onConfirm('skip')}
            disabled={isProcessing}
            className="gap-2"
          >
            <SkipForward className="h-4 w-4" />
            Pular duplicatas
          </Button>
          {mergeableDuplicates.length > 0 && (
            <Button
              onClick={() => onConfirm('merge')}
              disabled={isProcessing}
              className="gap-2"
            >
              <GitMerge className="h-4 w-4" />
              Mesclar campos vazios
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
