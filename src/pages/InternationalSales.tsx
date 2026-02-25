import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Globe, DollarSign, MapPin, BarChart3, Ticket } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ClientSelector } from '@/components/dashboard/ClientSelector';
import { PlatformFilter } from '@/components/dashboard/PlatformFilter';
import { PlatformType } from '@/hooks/useCombinedStats';
import { useCombinedTransactions, UnifiedTransaction } from '@/hooks/useCombinedTransactions';
import { normalizeCountry, isBrazil } from '@/lib/countryNormalization';
import { CountrySalesChart } from '@/components/international/CountrySalesChart';
import { InternationalBuyersTable } from '@/components/international/InternationalBuyersTable';
import { ExportBuyersDialog } from '@/components/international/ExportBuyersDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function InternationalSales() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [clientId, setClientId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<PlatformType>('all');

  const { transactions, isLoading } = useCombinedTransactions({
    startDate: dateRange?.from,
    endDate: dateRange?.to,
    clientId,
    platform,
  });

  // Filter international only + normalize
  const international = useMemo(() => {
    return transactions
      .filter((t) => t.country && !isBrazil(t.country))
      .map((t) => ({
        ...t,
        country: normalizeCountry(t.country) || t.country!,
      }));
  }, [transactions]);

  // Country summary
  const countrySummary = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    international.forEach((t) => {
      if (!map[t.country]) map[t.country] = { count: 0, total: 0 };
      map[t.country].count += 1;
      map[t.country].total += t.value;
    });
    return Object.entries(map)
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [international]);

  const totalValue = international.reduce((s, t) => s + t.value, 0);
  const countryCount = countrySummary.length;
  const avgTicket = international.length > 0 ? totalValue / international.length : 0;

  const periodLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
    : 'Todos os períodos';

  const buyersForExport = international.map((t) => ({
    buyer_name: t.buyer_name,
    buyer_email: t.buyer_email,
    country: t.country,
    product: t.product,
    value: t.value,
    currency: t.currency,
    date: t.date,
    platform: t.platform,
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Vendas Internacionais</h1>
              <p className="text-sm text-muted-foreground">Transações fora do Brasil</p>
            </div>
          </div>
          <ExportBuyersDialog
            buyers={buyersForExport}
            countrySummary={countrySummary}
            periodLabel={periodLabel}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <ClientSelector value={clientId} onChange={setClientId} />
          <PlatformFilter value={platform} onChange={setPlatform} />
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Total Internacional" value={`$${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            <KpiCard icon={MapPin} label="Países" value={String(countryCount)} />
            <KpiCard icon={BarChart3} label="Transações" value={String(international.length)} />
            <KpiCard icon={Ticket} label="Ticket Médio" value={`$${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
          </div>
        )}

        {/* Chart + Country Table */}
        <div className="grid lg:grid-cols-2 gap-6">
          <CountrySalesChart data={countrySummary} />

          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-base mb-3">Vendas por País</h3>
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>País</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countrySummary.map((row) => (
                      <TableRow key={row.country}>
                        <TableCell className="font-medium">{row.country}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {totalValue > 0 ? ((row.total / totalValue) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {countrySummary.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhuma venda internacional encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </div>

        {/* Buyers Table */}
        <InternationalBuyersTable
          buyers={international.map((t) => ({
            id: t.id,
            buyer_name: t.buyer_name,
            buyer_email: t.buyer_email,
            country: t.country,
            product: t.product,
            value: t.value,
            currency: t.currency,
            date: t.date,
            platform: t.platform,
          }))}
        />
      </div>
    </MainLayout>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
