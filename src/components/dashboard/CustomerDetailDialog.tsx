import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

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
  platform: 'hotmart' | 'tmb' | 'eduzz' | 'cispay';
  product: string | null;
  value: number;
  currency: string;
  date: string | null;
  rawData: Record<string, any>;
}

const platformConfig = {
  hotmart: { label: 'Hotmart', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  tmb: { label: 'TMB', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  eduzz: { label: 'Eduzz', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

const hotmartLabels: Record<string, string> = {
  transaction_code: 'ID da Transação',
  buyer_name: 'Nome',
  buyer_email: 'Email',
  buyer_phone: 'Telefone',
  country: 'País',
  product_id: 'Produto ID',
  product_ucode: 'Produto UCode',
  payment_method: 'Método de Pagamento',
  billing_type: 'Tipo de Cobrança',
  business_model: 'Modelo de Negócio',
  offer_code: 'Código da Oferta',
  sck_code: 'SCK',
  total_installments: 'Parcelas',
  recurrence_number: 'Recorrência',
  subscription_status: 'Status Assinatura',
  subscriber_code: 'Código Assinante',
  gross_value_with_taxes: 'Valor Bruto c/ Taxas',
  producer_commission: 'Comissão Produtor',
  marketplace_commission: 'Comissão Marketplace',
  original_currency: 'Moeda Original',
  original_value: 'Valor Original',
  projected_value: 'Valor Projetado',
  date_next_charge: 'Próxima Cobrança',
  source: 'Fonte',
};

const tmbLabels: Record<string, string> = {
  order_id: 'ID do Pedido',
  buyer_name: 'Nome',
  buyer_email: 'Email',
  buyer_phone: 'Telefone',
  status: 'Status',
  cancelled_at: 'Data Cancelamento',
  utm_source: 'UTM Source',
  utm_medium: 'UTM Medium',
  utm_campaign: 'UTM Campaign',
  utm_content: 'UTM Content',
  source: 'Fonte',
};

const eduzzLabels: Record<string, string> = {
  sale_id: 'ID da Venda',
  buyer_name: 'Nome',
  buyer_email: 'Email',
  buyer_phone: 'Telefone',
  invoice_code: 'Código Fatura',
  product_id: 'Produto ID',
  original_value: 'Valor Original',
  original_currency: 'Moeda Original',
  utm_source: 'UTM Source',
  utm_medium: 'UTM Medium',
  utm_campaign: 'UTM Campaign',
  utm_content: 'UTM Content',
  source: 'Fonte',
};

const labelsByPlatform: Record<string, Record<string, string>> = {
  hotmart: hotmartLabels,
  tmb: tmbLabels,
  eduzz: eduzzLabels,
};

function formatDetailValue(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key.includes('date') || key.includes('_at') || key === 'date_next_charge') {
    try {
      return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'number') return String(value);
  return String(value);
}

function TransactionDetails({
  transaction,
  showRaw,
  onToggleRaw,
}: {
  transaction: UnifiedTransaction;
  showRaw: boolean;
  onToggleRaw: () => void;
}) {
  const labels = labelsByPlatform[transaction.platform] || {};
  const entries = Object.keys(labels)
    .map((key) => ({ label: labels[key], value: transaction.rawData[key] }))
    .filter((e) => e.value !== null && e.value !== undefined && e.value !== '');

  const sanitizedRaw = Object.fromEntries(
    Object.entries(transaction.rawData).filter(
      ([key]) => !['user_id', 'client_id', 'import_id'].includes(key)
    )
  );

  return (
    <>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground p-2">Sem dados adicionais</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 p-3">
          {entries.map((e, i) => (
            <div key={i} className="text-sm">
              <span className="text-muted-foreground">{e.label}: </span>
              <span className="font-medium">{formatDetailValue(Object.keys(labels)[i], e.value)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="px-3 pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground gap-1 h-7"
          onClick={onToggleRaw}
        >
          <Code className="h-3 w-3" />
          {showRaw ? 'Ocultar webhook completo' : 'Ver webhook completo'}
        </Button>
        {showRaw && (
          <div className="mt-2 bg-muted rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
            <pre className="text-xs font-mono p-3 whitespace-pre">
              {JSON.stringify(sanitizedRaw, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

export function CustomerDetailDialog({
  open,
  onOpenChange,
  customerEmail,
  customerName,
  startDate,
  endDate,
  clientId,
}: CustomerDetailDialogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRawId, setShowRawId] = useState<string | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['customer-detail', customerEmail, startDate, endDate, clientId],
    queryFn: async () => {
      const unified: UnifiedTransaction[] = [];
      const queries: Promise<void>[] = [];

      // Hotmart - select all
      queries.push(
        (async () => {
          let q = supabase.from('transactions').select('*').eq('buyer_email', customerEmail);
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
              rawData: t,
            })
          );
        })()
      );

      // TMB - select all
      queries.push(
        (async () => {
          let q = supabase.from('tmb_transactions').select('*').eq('buyer_email', customerEmail);
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
              rawData: t,
            })
          );
        })()
      );

      // Eduzz - select all
      queries.push(
        (async () => {
          let q = supabase.from('eduzz_transactions').select('*').eq('buyer_email', customerEmail);
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
              rawData: t,
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
                  <>
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
                    <TableRow key={`${t.id}-actions`} className="hover:bg-transparent border-0">
                      <TableCell colSpan={5} className="py-0 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground gap-1 h-7"
                          onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                        >
                          {expandedId === t.id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          Ver mais detalhes da compra
                        </Button>
                        {expandedId === t.id && (
                          <div className="bg-muted/50 rounded-md mb-2">
                            <TransactionDetails
                              transaction={t}
                              showRaw={showRawId === t.id}
                              onToggleRaw={() => setShowRawId(showRawId === t.id ? null : t.id)}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
