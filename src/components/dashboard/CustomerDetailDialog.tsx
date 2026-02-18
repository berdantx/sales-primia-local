import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerEmail: string;
  customerName: string;
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
}

interface UnifiedTransaction {
  id: string;
  orderId: string | null;
  platform: 'hotmart' | 'tmb' | 'eduzz';
  product: string | null;
  value: number;
  currency: string;
  date: string | null;
}

const platformConfig = {
  hotmart: { label: 'Hotmart', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  tmb: { label: 'TMB', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  eduzz: { label: 'Eduzz', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

export function CustomerDetailDialog({
  open,
  onOpenChange,
  customerEmail,
  customerName,
  startDate,
  endDate,
  clientId,
}: CustomerDetailDialogProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['customer-detail', customerEmail, startDate, endDate, clientId],
    queryFn: async () => {
      const unified: UnifiedTransaction[] = [];

      // Build parallel queries
      const queries: Promise<void>[] = [];

      // Hotmart
      queries.push(
        (async () => {
          let q = supabase
            .from('transactions')
            .select('id, transaction_code, product, computed_value, currency, purchase_date')
            .eq('buyer_email', customerEmail);
          if (clientId) q = q.eq('client_id', clientId);
          if (startDate) q = q.gte('purchase_date', startDate.toISOString());
          if (endDate) q = q.lte('purchase_date', endDate.toISOString());
          const { data } = await q;
          data?.forEach((t) =>
            unified.push({
              id: t.id,
              orderId: t.transaction_code,
              platform: 'hotmart',
              product: t.product,
              value: t.computed_value,
              currency: t.currency,
              date: t.purchase_date,
            })
          );
        })()
      );

      // TMB
      queries.push(
        (async () => {
          let q = supabase
            .from('tmb_transactions')
            .select('id, order_id, product, ticket_value, currency, effective_date')
            .eq('buyer_email', customerEmail);
          if (clientId) q = q.eq('client_id', clientId);
          if (startDate) q = q.gte('effective_date', startDate.toISOString());
          if (endDate) q = q.lte('effective_date', endDate.toISOString());
          const { data } = await q;
          data?.forEach((t) =>
            unified.push({
              id: t.id,
              orderId: t.order_id,
              platform: 'tmb',
              product: t.product,
              value: t.ticket_value,
              currency: t.currency || 'BRL',
              date: t.effective_date,
            })
          );
        })()
      );

      // Eduzz
      queries.push(
        (async () => {
          let q = supabase
            .from('eduzz_transactions')
            .select('id, sale_id, product, sale_value, currency, sale_date')
            .eq('buyer_email', customerEmail);
          if (clientId) q = q.eq('client_id', clientId);
          if (startDate) q = q.gte('sale_date', startDate.toISOString());
          if (endDate) q = q.lte('sale_date', endDate.toISOString());
          const { data } = await q;
          data?.forEach((t) =>
            unified.push({
              id: t.id,
              orderId: t.sale_id,
              platform: 'eduzz',
              product: t.product,
              value: t.sale_value,
              currency: t.currency || 'BRL',
              date: t.sale_date,
            })
          );
        })()
      );

      await Promise.all(queries);

      return unified.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    },
    enabled: open && !!customerEmail,
  });

  const totalValue = transactions?.reduce((sum, t) => sum + t.value, 0) ?? 0;
  const totalCount = transactions?.length ?? 0;
  const mainCurrency = transactions?.[0]?.currency ?? 'BRL';

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(customerName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{customerName}</DialogTitle>
              <DialogDescription>{customerEmail}</DialogDescription>
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{formatCurrency(totalValue, mainCurrency)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Compras: </span>
              <span className="font-semibold">{totalCount}</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] mt-2">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : totalCount === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma transação encontrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      {t.date
                        ? format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR })
                        : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">
                      {t.orderId || '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {t.product || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={platformConfig[t.platform].className}>
                        {platformConfig[t.platform].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(t.value, t.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
