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
          <Badge variant="outline" className="ml-2 text-xs shrink-0">BRL</Badge>
        </div>
        {transaction.utm_source && (
          <div className="flex justify-between items-center mb-2">
            <Badge variant="secondary" className="text-xs">
              {transaction.utm_source}
            </Badge>
          </div>
        )}
        <div className="flex justify-between items-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground cursor-help">
                  {transaction.sale_date 
                    ? formatDateTimeBR(transaction.sale_date, 'dd/MM/yy HH:mm')
                    : 'Sem data'
                  }
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {transaction.sale_date 
                    ? formatDateTimeUTC(transaction.sale_date, 'dd/MM/yyyy HH:mm:ss')
                    : 'Sem data UTC'
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-sm font-semibold text-right">
            {formatCurrency(Number(transaction.sale_value), 'BRL')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
