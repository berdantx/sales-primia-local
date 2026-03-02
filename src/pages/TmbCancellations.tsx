import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useTmbTransactions, TmbTransaction } from '@/hooks/useTmbTransactions';
import { useTmbTransactionStatsOptimized } from '@/hooks/useTmbTransactionStatsOptimized';
import { useTmbDeletionLogs } from '@/hooks/useTmbDeletionLogs';
import { useFilter } from '@/contexts/FilterContext';
import { useFinancialAccess } from '@/hooks/useFinancialAccess';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { RestrictedFinancialSection } from '@/components/dashboard/RestrictedFinancialSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { format } from 'date-fns';
import { getDateRangeBrasiliaUTC, startOfDayBrasiliaUTC, endOfDayBrasiliaUTC, formatDateTimeBR } from '@/lib/dateUtils';
import {
  Search, Download, Loader2, ChevronLeft, ChevronRight,
  FileSpreadsheet, Ban, DollarSign, TrendingDown, Calendar, Trash2, User,
} from 'lucide-react';
import { ExecutiveKPICard } from '@/components/dashboard/ExecutiveKPICard';
import { ActiveClientBlock } from '@/components/layout/ActiveClientBlock';
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
  const [activeTab, setActiveTab] = useState('automatic');

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
  const { data: deletionLogs, isLoading: isLoadingLogs } = useTmbDeletionLogs(filters);

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

  const totalPagesCancelled = Math.ceil(cancelledTransactions.length / ITEMS_PER_PAGE);

  // Pagination for manual tab
  const paginatedLogs = useMemo(() => {
    if (!deletionLogs) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return deletionLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [deletionLogs, currentPage]);
  const totalPagesLogs = Math.ceil((deletionLogs?.length || 0) / ITEMS_PER_PAGE);

  const cancellationRate = useMemo(() => {
    const total = (stats?.totalTransactions || 0) + (stats?.cancelledCount || 0);
    if (total === 0) return 0;
    return ((stats?.cancelledCount || 0) / total) * 100;
  }, [stats]);

  // Manual deletion totals
  const manualTotal = useMemo(() => {
    if (!deletionLogs) return 0;
    return deletionLogs.reduce((sum, log) => sum + Number(log.transaction_data?.ticket_value || 0), 0);
  }, [deletionLogs]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (activeTab === 'automatic') {
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
      downloadCSV(csv, `tmb-cancelamentos-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } else {
      const headers = ['ID Pedido', 'Produto', 'Cliente', 'Valor', 'Excluído Por', 'Motivo', 'Data Exclusão'];
      const rows = (deletionLogs || []).map(log => [
        log.transaction_identifier,
        log.transaction_data?.product || '',
        log.transaction_data?.buyer_name || '',
        log.transaction_data?.ticket_value || 0,
        log.deleted_by_name || '',
        log.justification,
        formatDateTimeBR(log.created_at, 'dd/MM/yyyy HH:mm'),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
      downloadCSV(csv, `tmb-exclusoes-manuais-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    }
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (isLoading || isLoadingStats || isLoadingLogs) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const currentTotalPages = activeTab === 'automatic' ? totalPagesCancelled : totalPagesLogs;
  const currentTotalItems = activeTab === 'automatic' ? cancelledTransactions.length : (deletionLogs?.length || 0);

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
            description={`${cancelledTransactions.length} cancelamentos automáticos · ${deletionLogs?.length || 0} exclusões manuais`}
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
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4"
          >
            <ExecutiveKPICard
              label="Total Cancelado"
              value={formatCurrency(stats?.cancelledTotal || 0, 'BRL')}
              subtitle={`${stats?.cancelledCount || 0} cancelamentos`}
              icon={DollarSign}
              microLabel="CANCELADO"
              accentColor="border-t-amber-400"
              iconClassName="bg-amber-500/10 text-amber-600"
            />
            <ExecutiveKPICard
              label="Taxa Cancelamento"
              value={`${cancellationRate.toFixed(1)}%`}
              subtitle="cancelados / total"
              icon={TrendingDown}
              microLabel="TAXA"
              accentColor="border-t-red-400"
              iconClassName="bg-red-500/10 text-red-600"
            />
            <ExecutiveKPICard
              label="Exclusões Manuais"
              value={(deletionLogs?.length || 0).toString()}
              subtitle="com justificativa"
              icon={Trash2}
              microLabel="MANUAIS"
              accentColor="border-t-violet-400"
              iconClassName="bg-violet-500/10 text-violet-600"
            />
            <ExecutiveKPICard
              label="Total Excluído"
              value={formatCurrency(manualTotal, 'BRL')}
              subtitle="exclusões manuais"
              icon={Ban}
              microLabel="EXCLUÍDO"
              accentColor="border-t-sky-400"
              iconClassName="bg-sky-500/10 text-sky-600"
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="automatic" className="gap-2">
              <Ban className="h-4 w-4" />
              Cancelamentos Automáticos
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Exclusões Manuais
            </TabsTrigger>
          </TabsList>

          {/* Automatic Cancellations Tab */}
          <TabsContent value="automatic">
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
                          <p className="text-muted-foreground">Nenhum cancelamento automático encontrado</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Deletions Tab */}
          <TabsContent value="manual">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Excluído Por</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data Exclusão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{log.transaction_identifier.slice(0, 12)}...</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.transaction_data?.product || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[180px]">
                            <p className="truncate font-medium text-sm">{log.transaction_data?.buyer_name || '-'}</p>
                            <p className="truncate text-xs text-muted-foreground">{log.transaction_data?.buyer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(Number(log.transaction_data?.ticket_value || 0), 'BRL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{log.deleted_by_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <Badge variant="outline" className="text-xs font-normal whitespace-normal text-left leading-tight border-warning/30 bg-warning/10 text-warning-foreground">
                            {log.justification}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateTimeBR(log.created_at, 'dd/MM/yy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Nenhuma exclusão manual encontrada</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {currentTotalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, currentTotalItems)} de {currentTotalItems}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center text-sm">{currentPage} / {currentTotalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(currentTotalPages, p + 1))} disabled={currentPage === currentTotalPages}>
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
