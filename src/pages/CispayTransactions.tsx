import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useCispayTransactions, CispayTransaction } from '@/hooks/useCispayTransactions';
import { useCispayTransactionStatsOptimized } from '@/hooks/useCispayTransactionStatsOptimized';
import { useFilter } from '@/contexts/FilterContext';
import { useFinancialAccess } from '@/hooks/useFinancialAccess';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { RestrictedFinancialSection } from '@/components/dashboard/RestrictedFinancialSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { format, parseISO } from 'date-fns';
import { getDateRangeBrasiliaUTC, startOfDayBrasiliaUTC, endOfDayBrasiliaUTC, formatDateTimeBR } from '@/lib/dateUtils';
import {
  Search, Download, Loader2, ChevronLeft, ChevronRight,
  DollarSign, ArrowUp, ArrowDown, ArrowUpDown, BarChart3,
} from 'lucide-react';
import { ExecutiveKPICard } from '@/components/dashboard/ExecutiveKPICard';
import { ActiveClientBlock } from '@/components/layout/ActiveClientBlock';
import { CispayTransactionCard } from '@/components/cispay/CispayTransactionCard';

const ITEMS_PER_PAGE = 20;
type PeriodFilter = '1d' | '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

function CispayTransactionsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<PeriodFilter>('365d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [sortColumn, setSortColumn] = useState<'date' | 'value' | 'product'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 500);
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
    const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return getDateRangeBrasiliaUTC(days);
  }, [period, customDateRange]);

  const filters = useMemo(() => ({
    startDate: dateRange.startDate, endDate: dateRange.endDate,
    search: debouncedSearch || undefined, clientId,
  }), [dateRange, debouncedSearch, clientId]);

  const { data: transactions, isLoading } = useCispayTransactions(filters);
  const { data: stats, isLoading: isLoadingStats } = useCispayTransactionStatsOptimized({
    startDate: dateRange.startDate, endDate: dateRange.endDate, clientId,
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      if (debouncedSearch) {
        const lower = debouncedSearch.toLowerCase();
        return t.product?.toLowerCase().includes(lower) ||
          t.buyer_name?.toLowerCase().includes(lower) ||
          t.buyer_email?.toLowerCase().includes(lower) ||
          t.sale_id.toLowerCase().includes(lower);
      }
      return true;
    });
  }, [transactions, debouncedSearch]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'date') {
        cmp = (a.sale_date ? new Date(a.sale_date).getTime() : 0) - (b.sale_date ? new Date(b.sale_date).getTime() : 0);
      } else if (sortColumn === 'value') {
        cmp = Number(a.sale_value) - Number(b.sale_value);
      } else {
        cmp = (a.product || '').localeCompare(b.product || '');
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [filteredTransactions, sortColumn, sortOrder]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const handleSort = (column: 'date' | 'value' | 'product') => {
    if (sortColumn === column) setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    else { setSortColumn(column); setSortOrder('desc'); }
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: 'date' | 'value' | 'product' }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  const handleExportCSV = () => {
    const headers = ['ID Venda', 'Produto', 'Código Curso', 'Cliente', 'Email', 'Telefone', 'Valor', 'Data', 'Turma', 'Promoção', 'Unidade'];
    const rows = filteredTransactions.map(t => [
      t.sale_id, t.product || '', t.product_code || '', t.buyer_name || '',
      t.buyer_email || '', t.buyer_phone || '', t.sale_value,
      t.sale_date ? formatDateTimeBR(t.sale_date, 'dd/MM/yyyy HH:mm') : '',
      t.turma || '', t.promotion || '', t.unit || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cispay-transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-3">
            <ActiveClientBlock />
            <ClientContextHeader
              title="Transações CIS PAY"
              description={`${filteredTransactions.length} transações encontradas`}
            />
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {canViewFinancials ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <ExecutiveKPICard
              label="Faturamento BRL"
              value={formatCurrency(stats?.totalBRL || 0, 'BRL')}
              subtitle="Transações CIS PAY"
              icon={DollarSign}
              microLabel="CAIXA"
              accentColor="border-t-indigo-400"
              iconClassName="bg-indigo-500/10 text-indigo-600"
            />
            <ExecutiveKPICard
              label="Total Transações"
              value={String(stats?.totalTransactions || 0)}
              subtitle="Registros no período"
              icon={BarChart3}
              microLabel="VOLUME"
              accentColor="border-t-sky-400"
              iconClassName="bg-sky-500/10 text-sky-600"
            />
            <ExecutiveKPICard
              label="Ticket Médio"
              value={formatCurrency(
                stats?.totalTransactions ? (stats.totalBRL / stats.totalTransactions) : 0,
                'BRL'
              )}
              subtitle="Valor médio por venda"
              icon={DollarSign}
              microLabel="MÉDIA"
              accentColor="border-t-purple-400"
              iconClassName="bg-purple-500/10 text-purple-600"
            />
          </div>
        ) : (
          <RestrictedFinancialSection />
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto, cliente, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={period} onValueChange={(v) => { setPeriod(v as PeriodFilter); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Hoje</SelectItem>
                  <SelectItem value="7d">7 dias</SelectItem>
                  <SelectItem value="30d">30 dias</SelectItem>
                  <SelectItem value="90d">90 dias</SelectItem>
                  <SelectItem value="365d">1 ano</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {period === 'custom' && (
                <DateRangePicker dateRange={customDateRange} onDateRangeChange={setCustomDateRange} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="block lg:hidden space-y-2">
          {paginatedTransactions.map((t) => (
            <CispayTransactionCard key={t.id} transaction={t} onClick={() => {}} />
          ))}
        </div>

        {/* Desktop Table */}
        <Card className="hidden lg:block">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Venda</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">Data <SortIcon column="date" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('product')}>
                    <div className="flex items-center gap-1">Produto <SortIcon column="product" /></div>
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('value')}>
                    <div className="flex items-center gap-1 justify-end">Valor <SortIcon column="value" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.sale_id}</TableCell>
                    <TableCell className="text-sm">
                      {t.sale_date ? formatDateTimeBR(t.sale_date, 'dd/MM/yy') : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.product || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{t.buyer_name || '-'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{t.turma || '-'}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(t.sale_value), 'BRL')}</TableCell>
                  </TableRow>
                ))}
                {paginatedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages} ({filteredTransactions.length} transações)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default CispayTransactionsPage;
