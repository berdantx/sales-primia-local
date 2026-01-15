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
  FileText
} from 'lucide-react';
import type { TmbTransaction } from '@/hooks/useTmbTransactions';

interface TmbTransactionDetailDialogProps {
  transaction: TmbTransaction | null;
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

export function TmbTransactionDetailDialog({ 
  transaction, 
  open, 
  onOpenChange 
}: TmbTransactionDetailDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes da Transação TMB
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Order Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={Hash} label="ID do Pedido" value={transaction.order_id} />
                <Separator className="my-1" />
                <InfoRow icon={Package} label="Produto" value={transaction.product} />
                <Separator className="my-1" />
                <div className="flex items-start gap-3 py-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Valor do Ticket</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(Number(transaction.ticket_value), 'BRL')}
                    </p>
                  </div>
                </div>
                <Separator className="my-1" />
                <InfoRow 
                  icon={Calendar} 
                  label="Data Efetiva" 
                  value={transaction.effective_date ? formatDateTimeBR(transaction.effective_date, 'dd/MM/yyyy HH:mm:ss') : null} 
                />
                <Separator className="my-1" />
                <div className="flex items-start gap-3 py-2">
                  <Link className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Fonte</p>
                    <Badge variant="outline" className="mt-1">
                      {transaction.source || 'import'}
                    </Badge>
                  </div>
                </div>
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
              </CardContent>
            </Card>

            {/* UTM Parameters */}
            {(transaction.utm_source || transaction.utm_medium || transaction.utm_campaign || transaction.utm_content) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Parâmetros UTM
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {transaction.utm_source && (
                      <div>
                        <p className="text-xs text-muted-foreground">Source</p>
                        <Badge variant="secondary" className="mt-1">{transaction.utm_source}</Badge>
                      </div>
                    )}
                    {transaction.utm_medium && (
                      <div>
                        <p className="text-xs text-muted-foreground">Medium</p>
                        <Badge variant="secondary" className="mt-1">{transaction.utm_medium}</Badge>
                      </div>
                    )}
                    {transaction.utm_campaign && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Campaign</p>
                        <Badge variant="secondary" className="mt-1">{transaction.utm_campaign}</Badge>
                      </div>
                    )}
                    {transaction.utm_content && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Content</p>
                        <Badge variant="secondary" className="mt-1">{transaction.utm_content}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
