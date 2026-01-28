import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { formatDateTimeBR } from '@/lib/dateUtils';
import { differenceInSeconds, differenceInMinutes, differenceInHours } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { DeleteEduzzTransactionDialog } from './DeleteEduzzTransactionDialog';
import { 
  Receipt, 
  User, 
  Mail, 
  Phone, 
  Package, 
  Calendar,
  Link,
  Hash,
  DollarSign,
  FileText,
  HelpCircle,
  Clock,
  Trash2
} from 'lucide-react';
import type { EduzzTransaction } from '@/hooks/useEduzzTransactions';

interface EduzzTransactionDetailDialogProps {
  transaction: EduzzTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  isLink?: boolean;
}

const InfoRow = ({ icon: Icon, label, value, isLink }: InfoRowProps) => {
  if (!value && value !== 0) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a 
            href={String(value)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {String(value)}
          </a>
        ) : (
          <p className="text-sm font-medium break-all">{String(value)}</p>
        )}
      </div>
    </div>
  );
};

export function EduzzTransactionDetailDialog({ 
  transaction, 
  open, 
  onOpenChange 
}: EduzzTransactionDetailDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { role } = useUserRole();
  const isMaster = role === 'master';

  if (!transaction) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Detalhes da Transação
              </DialogTitle>
              {isMaster && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
          </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Sale Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações da Venda
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={Hash} label="ID da Venda" value={transaction.sale_id} />
                <Separator className="my-1" />
                <InfoRow icon={FileText} label="Código da Fatura" value={transaction.invoice_code} />
                <Separator className="my-1" />
                <InfoRow icon={Package} label="Produto" value={transaction.product} />
                <Separator className="my-1" />
                <InfoRow icon={Hash} label="ID do Produto" value={transaction.product_id} />
                <Separator className="my-1" />
                <div className="flex items-start gap-3 py-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(Number(transaction.sale_value), transaction.currency || 'BRL')}
                      </p>
                      <Badge variant="outline">{transaction.currency || 'BRL'}</Badge>
                    </div>
                  </div>
                </div>
                <Separator className="my-1" />
                <InfoRow 
                  icon={Calendar} 
                  label="Data da Venda" 
                  value={transaction.sale_date ? formatDateTimeBR(transaction.sale_date, 'dd/MM/yyyy HH:mm:ss') : null} 
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
                <Separator className="my-1" />
                <InfoRow icon={Phone} label="Telefone" value={transaction.buyer_phone} />
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
                {/* Registrado em with tooltip */}
                <div className="flex items-start gap-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">Registrado em</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[250px]">
                            <p className="text-xs">
                              Este é o momento em que o webhook foi recebido pelo sistema, 
                              não a data em que a venda ocorreu na Eduzz.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm font-medium">
                      {formatDateTimeBR(transaction.created_at, 'dd/MM/yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
                
                {/* Webhook Latency Indicator */}
                {transaction.sale_date && transaction.created_at && (() => {
                  const saleDate = new Date(transaction.sale_date);
                  const createdAt = new Date(transaction.created_at);
                  const totalSeconds = differenceInSeconds(createdAt, saleDate);
                  const hours = differenceInHours(createdAt, saleDate);
                  const minutes = differenceInMinutes(createdAt, saleDate) % 60;
                  const seconds = totalSeconds % 60;
                  
                  // Determine color based on latency
                  let colorClass = 'text-green-600 bg-green-500/10 border-green-500/20';
                  let statusText = 'Normal';
                  if (hours >= 6) {
                    colorClass = 'text-red-600 bg-red-500/10 border-red-500/20';
                    statusText = 'Alto';
                  } else if (hours >= 1) {
                    colorClass = 'text-amber-600 bg-amber-500/10 border-amber-500/20';
                    statusText = 'Moderado';
                  }
                  
                  const formattedLatency = hours > 0 
                    ? `${hours}h ${minutes}min ${seconds}s`
                    : minutes > 0 
                      ? `${minutes}min ${seconds}s`
                      : `${seconds}s`;
                  
                  return (
                    <>
                      <Separator className="my-2" />
                      <div className="flex items-start gap-3 py-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground">Latência do Webhook</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px]">
                                  <p className="text-xs">
                                    Tempo entre a venda na Eduzz e o recebimento do webhook 
                                    pelo sistema. Atrasos podem ocorrer por processamento 
                                    em lote ou filas da Eduzz.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={colorClass}>
                              {formattedLatency}
                            </Badge>
                            <span className={`text-xs ${colorClass.split(' ')[0]}`}>
                              {statusText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <DeleteEduzzTransactionDialog
      transaction={transaction}
      open={isDeleteDialogOpen}
      onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) onOpenChange(false);
      }}
    />
  </>
  );
}
