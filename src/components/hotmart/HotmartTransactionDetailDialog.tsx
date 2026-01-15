import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { formatDateTimeBR } from '@/lib/dateUtils';
import { 
  Receipt, 
  User, 
  Mail, 
  Package, 
  Calendar,
  Link,
  Hash,
  DollarSign,
  FileText,
  Globe,
  CreditCard,
  Repeat
} from 'lucide-react';
import type { Transaction } from '@/hooks/useTransactions';

interface HotmartTransactionDetailDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
}

const InfoRow = ({ icon: Icon, label, value }: InfoRowProps) => {
  if (!value && value !== 0) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{String(value)}</p>
      </div>
    </div>
  );
};

export function HotmartTransactionDetailDialog({ 
  transaction, 
  open, 
  onOpenChange 
}: HotmartTransactionDetailDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes da Transação Hotmart
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Transaction Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações da Transação
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={Hash} label="Código da Transação" value={transaction.transaction_code} />
                <Separator className="my-1" />
                <InfoRow icon={Package} label="Produto" value={transaction.product} />
                <Separator className="my-1" />
                <div className="flex items-start gap-3 py-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Valor Computado</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(Number(transaction.computed_value), transaction.currency)}
                    </p>
                  </div>
                </div>
                <Separator className="my-1" />
                <div className="flex items-start gap-3 py-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Valor Bruto com Taxas</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(Number(transaction.gross_value_with_taxes), transaction.currency)}
                    </p>
                  </div>
                </div>
                <Separator className="my-1" />
                <InfoRow 
                  icon={Calendar} 
                  label="Data da Compra" 
                  value={transaction.purchase_date ? formatDateTimeBR(transaction.purchase_date, 'dd/MM/yyyy HH:mm:ss') : null} 
                />
              </CardContent>
            </Card>

            {/* Buyer Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações do Comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={User} label="Nome" value={transaction.buyer_name} />
                <Separator className="my-1" />
                <InfoRow icon={Mail} label="Email" value={transaction.buyer_email} />
                <Separator className="my-1" />
                <InfoRow icon={Globe} label="País" value={transaction.country} />
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Informações de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start gap-3 py-2">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Moeda</p>
                    <Badge variant="outline" className="mt-1">{transaction.currency}</Badge>
                  </div>
                </div>
                <Separator className="my-1" />
                {transaction.payment_method && (
                  <>
                    <div className="flex items-start gap-3 py-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Método de Pagamento</p>
                        <Badge variant="secondary" className="mt-1">{transaction.payment_method}</Badge>
                      </div>
                    </div>
                    <Separator className="my-1" />
                  </>
                )}
                {transaction.billing_type && (
                  <>
                    <div className="flex items-start gap-3 py-2">
                      <Repeat className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Tipo de Cobrança</p>
                        <Badge variant="secondary" className="mt-1">{transaction.billing_type}</Badge>
                      </div>
                    </div>
                    <Separator className="my-1" />
                  </>
                )}
                <InfoRow icon={Hash} label="Total de Parcelas" value={transaction.total_installments} />
                <Separator className="my-1" />
                <InfoRow icon={Link} label="Código SCK" value={transaction.sck_code} />
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow 
                  icon={Calendar} 
                  label="Registrado em" 
                  value={formatDateTimeBR(transaction.created_at, 'dd/MM/yyyy HH:mm:ss')} 
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
