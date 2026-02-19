import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { formatDateTimeBR, formatDateTimeUTC } from '@/lib/dateUtils';
import { EduzzTransaction } from '@/hooks/useEduzzTransactions';
import { InstallmentBadge } from '@/components/transactions/InstallmentBadge';

interface EduzzTransactionCardProps {
  transaction: EduzzTransaction;
  onClick: () => void;
}

export function EduzzTransactionCard({ transaction, onClick }: EduzzTransactionCardProps) {
  return (
    <Card className="mb-2 cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{transaction.product || 'Sem produto'}</p>
            <p className="text-xs text-muted-foreground truncate">{transaction.buyer_name || '-'}</p>
          </div>
          {transaction.original_currency ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="ml-2 text-xs shrink-0 border-amber-500/50 bg-amber-500/10 text-amber-600">
                    {transaction.original_currency} → {transaction.currency || 'USD'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Convertido de {formatCurrency(Number(transaction.original_value), transaction.original_currency)} para {formatCurrency(Number(transaction.sale_value), transaction.currency || 'USD')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Badge variant="outline" className="ml-2 text-xs shrink-0">{transaction.currency || 'BRL'}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {transaction.total_installments && transaction.total_installments > 1 && (
            <InstallmentBadge
              recurrenceNumber={null}
              totalInstallments={transaction.total_installments}
              billingType="inteligente"
              compact
            />
          )}
          {transaction.payment_method && (
            <Badge variant="secondary" className="text-xs">
              {transaction.payment_method}
            </Badge>
          )}
          {transaction.utm_source && (
            <Badge variant="secondary" className="text-xs">
              {transaction.utm_source}
            </Badge>
          )}
        </div>
        <div className="flex justify-between items-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground cursor-help">
                  {transaction.created_at 
                    ? formatDateTimeBR(transaction.created_at, 'dd/MM/yy HH:mm')
                    : 'Sem data'
                  }
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p>Registro: {transaction.created_at ? formatDateTimeUTC(transaction.created_at, 'dd/MM/yyyy HH:mm:ss') : '-'}</p>
                  <p className="text-muted-foreground">Venda: {transaction.sale_date ? formatDateTimeUTC(transaction.sale_date, 'dd/MM/yyyy HH:mm:ss') : '-'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-sm font-semibold text-right">
            {formatCurrency(Number(transaction.sale_value), transaction.currency || 'BRL')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
