import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { formatDateTimeBR } from '@/lib/dateUtils';
import { CispayTransaction } from '@/hooks/useCispayTransactions';

interface CispayTransactionCardProps {
  transaction: CispayTransaction;
  onClick: () => void;
}

export function CispayTransactionCard({ transaction, onClick }: CispayTransactionCardProps) {
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
        <div className="flex flex-wrap gap-1.5 mb-2">
          {transaction.turma && (
            <Badge variant="secondary" className="text-xs">{transaction.turma}</Badge>
          )}
          {transaction.unit && (
            <Badge variant="secondary" className="text-xs">{transaction.unit}</Badge>
          )}
        </div>
        <div className="flex justify-between items-end">
          <div className="text-xs text-muted-foreground">
            {transaction.sale_date
              ? formatDateTimeBR(transaction.sale_date, 'dd/MM/yy HH:mm')
              : 'Sem data'}
          </div>
          <div className="text-sm font-semibold text-right">
            {formatCurrency(Number(transaction.sale_value), 'BRL')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
