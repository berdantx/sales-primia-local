import { useState } from 'react';
import { Handshake, DollarSign, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useMyCoproductions, useCoproducerCommissions } from '@/hooks/useCoproducerCommissions';

type PeriodKey = '1d' | '7d' | '30d' | '90d' | '365d' | 'all';

const periods: { key: PeriodKey; label: string }[] = [
  { key: '1d', label: 'Último dia' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: '365d', label: '1 ano' },
  { key: 'all', label: 'Tudo' },
];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Coproduction() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('30d');

  const { data: coproductions, isLoading: loadingCoprod } = useMyCoproductions(user?.id ?? null);
  const { data: commissions, isLoading: loadingComm } = useCoproducerCommissions(coproductions, period);

  const isLoading = loadingCoprod || loadingComm;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            Minhas Coproduções
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas comissões por produto e canal de venda
          </p>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap gap-2">
          {periods.map(p => (
            <Button
              key={p.key}
              variant={period === p.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* KPI Total */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-primary/10 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de comissões no período</p>
              {isLoading ? (
                <Skeleton className="h-8 w-40 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{fmt(commissions?.grandTotal ?? 0)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {!isLoading && (!coproductions?.length || !commissions?.clients?.length) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Você não possui coproduções ativas no momento.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Client accordions */}
        {!isLoading && commissions?.clients && commissions.clients.length > 0 && (
          <Accordion type="multiple" defaultValue={commissions.clients.map(c => c.clientId)}>
            {commissions.clients.map(client => (
              <AccordionItem key={client.clientId} value={client.clientId} className="border rounded-lg mb-4 px-2">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-base">{client.clientName}</span>
                    </div>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {fmt(client.subtotal)}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Taxa</TableHead>
                          <TableHead className="text-right">Hotmart</TableHead>
                          <TableHead className="text-right">TMB</TableHead>
                          <TableHead className="text-right">Eduzz</TableHead>
                          <TableHead className="text-right font-semibold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.products.map(prod => (
                          <TableRow key={prod.productName}>
                            <TableCell className="font-medium">{prod.productName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{prod.ratePercent}%</Badge>
                            </TableCell>
                            <TableCell className="text-right">{fmt(prod.hotmart)}</TableCell>
                            <TableCell className="text-right">{fmt(prod.tmb)}</TableCell>
                            <TableCell className="text-right">{fmt(prod.eduzz)}</TableCell>
                            <TableCell className="text-right font-semibold">{fmt(prod.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={5}>Subtotal {client.clientName}</TableCell>
                          <TableCell className="text-right">{fmt(client.subtotal)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </MainLayout>
  );
}
