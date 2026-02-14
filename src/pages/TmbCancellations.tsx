import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useTmbTransactions, TmbTransaction } from '@/hooks/useTmbTransactions';
import { useTmbTransactionStatsOptimized } from '@/hooks/useTmbTransactionStatsOptimized';
import { useFilter } from '@/contexts/FilterContext';
import { useFinancialAccess } from '@/hooks/useFinancialAccess';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { RestrictedFinancialSection } from '@/components/dashboard/RestrictedFinancialSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { format } from 'date-fns';
import { getDateRangeBrasiliaUTC, startOfDayBrasiliaUTC, endOfDayBrasiliaUTC, formatDateTimeBR } from '@/lib/dateUtils';
import {
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Ban,
  DollarSign,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { TmbTransactionDetailDialog } from '@/components/tmb/TmbTransactionDetailDialog';

const ITEMS_PER_PAGE = 20;
type PeriodFilter = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

function TmbCancellations() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<PeriodFilter>('365d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [selectedTransaction, setSelectedTransaction] = useState<TmbTransaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { clientId } = useFilter();
  const { canViewFinancials, isLoading: isLoadingFinancialAccess } = useFinancialAccess(clientId);

  const dateRange = useMemo(() => {
    if (period === 'all') return { startDate: undefined, endDate: undefined };
    if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
      return { startDate: startOfDayBrasiliaUTC(customDateRange.from), endDate: endOfDayBrasiliaUTC(customDateRange.to) };
    }
    if (period === 'custom') return { startDate: undefined, endDate: undefined };
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return getDateRangeBrasiliaUTC(days);
  }, [period, customDateRange]);

  const filters = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    search: debouncedSearch || undefined,
    clientId,
  }), [dateRange, debouncedSearch, clientId]);

  const { data: transactions, isLoading } = useTmbTransactions(filters);
  const { data: stats, isLoading: isLoadingStats } = useTmbTransactionStatsOptimized({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    clientId,
  });

  // Only cancelled transactions
  const cancelledTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      if (t.status !== 'cancelado') return false;
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return t.product?.toLowerCase().includes(s) ||
          t.buyer_name?.toLowerCase().includes(s) ||
          t.buyer_email?.toLowerCase().includes(s) ||
          t.order_id.toLowerCase().includes(s);
      }
      return true;
    });
  }, [transactions, debouncedSearch]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return cancelledTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [cancelledTransactions, currentPage]);

  const totalPages = Math.ceil(cancelledTransactions.length / ITEMS_PER_PAGE);

  const cancellationRate = useMemo(() => {
    const total = (stats?.totalTransactions || 0) + (stats?.cancelledCount || 0);
    if (total === 0) return 0;
    return ((stats?.cancelledCount || 0) / total) * 100;
  }, [stats]);

  const handleExportCSV = () => {
    const headers = ['ID Pedido', 'Produto', 'Cliente', 'Email', 'Valor', 'Data Venda', 'Data Cancelamento'];
    const rows = cancelledTransactions.map(t => [
      t.order_id,
      t.product || '',
      t.buyer_name || '',
      t.buyer_email || '',
      t.ticket_value,
      t.effective_date ? formatDateTimeBR(t.effective_date, 'dd/MM/yyyy HH:mm') : '',
      t.cancelled_at ? formatDateTimeBR(t.cancelled_at, 'dd/MM/yyyy HH:mm') : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmb-cancelamentos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading || isLoadingStats) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <ClientContextHeader 
            title="Cancelamentos TMB"
            description={`${cancelledTransactions.length} vendas canceladas`}
          />
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </motion.div>

        {/* KPIs */}
        {canViewFinancials ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4"
          >
            <ColoredKPICard
              title="Total Cancelado"
              value={formatCurrency(stats?.cancelledTotal || 0, 'BRL')}
              subtitle={`${stats?.cancelledCount || 0} cancelamentos`}
              icon={DollarSign}
              variant="red"
              delay={0}
            />
            <ColoredKPICard
              title="Qtd. Cancelamentos"
              value={(stats?.cancelledCount || 0).toString()}
              subtitle="no período"
              icon={Ban}
              variant="orange"
              delay={1}
            />
            <ColoredKPICard
              title="Taxa de Cancelamento"
              value={`${cancellationRate.toFixed(1)}%`}
              subtitle="cancelados / total"
              icon={TrendingDown}
              variant="yellow"
              delay={2}
            />
          </motion.div>
        ) : (
          <RestrictedFinancialSection />
        )}

        {/* Period + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={period} onValueChange={(v) => { setPeriod(v as PeriodFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="365d">Último ano</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === 'custom' && (
            <DateRangePicker
              dateRange={customDateRange}
              onDateRangeChange={setCustomDateRange}
              className="w-full sm:w-[260px]"
            />
          )}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto, cliente, email ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data Venda</TableHead>
                  <TableHead>Data Cancelamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((t) => (
                  <TableRow 
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => { setSelectedTransaction(t); setIsDetailOpen(true); }}
                  >
                    <TableCell className="font-mono text-xs">{t.order_id.slice(0, 12)}...</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.product || '-'}</TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="truncate font-medium text-sm">{t.buyer_name || '-'}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.buyer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {formatCurrency(Number(t.ticket_value), 'BRL')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.effective_date ? formatDateTimeBR(t.effective_date, 'dd/MM/yy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.cancelled_at ? formatDateTimeBR(t.cancelled_at, 'dd/MM/yy HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum cancelamento encontrado no período</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, cancelledTransactions.length)} de {cancelledTransactions.length}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center text-sm">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <TmbTransactionDetailDialog
          transaction={selectedTransaction}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      </div>
    </MainLayout>
  );
}

export default TmbCancellations;
