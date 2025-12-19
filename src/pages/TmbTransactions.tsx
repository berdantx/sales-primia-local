import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTmbTransactions } from '@/hooks/useTmbTransactions';
import { useTmbTransactionStatsOptimized } from '@/hooks/useTmbTransactionStatsOptimized';
import { useFilter } from '@/contexts/FilterContext';
import { TmbAdvancedFilters } from '@/components/dashboard/TmbAdvancedFilters';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ClientSelector } from '@/components/dashboard/ClientSelector';
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
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  X,
  DollarSign,
  Receipt,
  Package,
  Calendar
} from 'lucide-react';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';

const ITEMS_PER_PAGE = 20;

type PeriodFilter = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

function TmbTransactions() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<PeriodFilter>('365d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  
  // Advanced filters
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [utmSourceFilter, setUtmSourceFilter] = useState<string | null>(null);
  const [utmMediumFilter, setUtmMediumFilter] = useState<string | null>(null);
  const [utmCampaignFilter, setUtmCampaignFilter] = useState<string | null>(null);

  const { clientId, setClientId } = useFilter();

  const dateRange = useMemo(() => {
    if (period === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
      return { startDate: customDateRange.from, endDate: customDateRange.to };
    }
    if (period === 'custom') {
      return { startDate: undefined, endDate: undefined };
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return { startDate: subDays(new Date(), days), endDate: new Date() };
  }, [period, customDateRange]);

  const filters = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    search: search || undefined,
    clientId,
  }), [dateRange, search, clientId]);

  const { data: transactions, isLoading, error } = useTmbTransactions(filters);
  const { data: stats, isLoading: isLoadingStats } = useTmbTransactionStatsOptimized({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    clientId,
  });

  // Get top product
  const topProduct = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    
    const productMap = new Map<string, { total: number; count: number }>();
    transactions.forEach(t => {
      const product = t.product || 'Desconhecido';
      const current = productMap.get(product) || { total: 0, count: 0 };
      productMap.set(product, {
        total: current.total + Number(t.ticket_value),
        count: current.count + 1,
      });
    });

    const sorted = Array.from(productMap.entries())
      .sort(([, a], [, b]) => b.total - a.total);
    
    return sorted[0] ? { name: sorted[0][0], total: sorted[0][1].total } : null;
  }, [transactions]);

  // Filter transactions by search and advanced filters
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      // Text search
      if (search) {
        const lowerSearch = search.toLowerCase();
        const matchesSearch = 
          t.product?.toLowerCase().includes(lowerSearch) ||
          t.buyer_name?.toLowerCase().includes(lowerSearch) ||
          t.buyer_email?.toLowerCase().includes(lowerSearch) ||
          t.order_id.toLowerCase().includes(lowerSearch);
        if (!matchesSearch) return false;
      }
      
      // Advanced filters
      if (productFilter && t.product !== productFilter) return false;
      if (utmSourceFilter && t.utm_source !== utmSourceFilter) return false;
      if (utmMediumFilter && t.utm_medium !== utmMediumFilter) return false;
      if (utmCampaignFilter && t.utm_campaign !== utmCampaignFilter) return false;
      
      return true;
    });
  }, [transactions, search, productFilter, utmSourceFilter, utmMediumFilter, utmCampaignFilter]);

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const handleExportCSV = () => {
    const headers = ['ID Pedido', 'Produto', 'Cliente', 'Email', 'Valor', 'Data', 'UTM Source', 'UTM Medium', 'UTM Campaign'];
    const rows = filteredTransactions.map(t => [
      t.order_id,
      t.product || '',
      t.buyer_name || '',
      t.buyer_email || '',
      t.ticket_value,
      t.effective_date ? format(parseISO(t.effective_date), 'dd/MM/yyyy HH:mm') : '',
      t.utm_source || '',
      t.utm_medium || '',
      t.utm_campaign || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmb-transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSearch('');
    setProductFilter(null);
    setUtmSourceFilter(null);
    setUtmMediumFilter(null);
    setUtmCampaignFilter(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = !!search || !!productFilter || !!utmSourceFilter || !!utmMediumFilter || !!utmCampaignFilter;

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
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Transações TMB</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {filteredTransactions.length} transações encontradas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <ClientSelector value={clientId} onChange={setClientId} />
            <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </motion.div>

        {/* Summary KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <ColoredKPICard
            title="Total em Reais"
            value={formatCurrency(stats?.totalBRL || 0, 'BRL')}
            subtitle={`${stats?.totalTransactions || 0} transações`}
            icon={DollarSign}
            variant="green"
            delay={0}
          />
          <ColoredKPICard
            title="Total de Transações"
            value={(stats?.totalTransactions || 0).toString()}
            subtitle="no período"
            icon={Receipt}
            variant="purple"
            delay={1}
          />
          {topProduct && (
            <ColoredKPICard
              title="Top Produto"
              value={topProduct.name.length > 25 ? topProduct.name.slice(0, 25) + '...' : topProduct.name}
              subtitle={formatCurrency(topProduct.total, 'BRL')}
              icon={Package}
              variant="blue"
              delay={2}
            />
          )}
        </motion.div>

        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
          </div>
        </motion.div>

        {/* Advanced Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <TmbAdvancedFilters
              product={productFilter}
              utmSource={utmSourceFilter}
              utmMedium={utmMediumFilter}
              utmCampaign={utmCampaignFilter}
              onProductChange={(v) => { setProductFilter(v); setCurrentPage(1); }}
              onUtmSourceChange={(v) => { setUtmSourceFilter(v); setCurrentPage(1); }}
              onUtmMediumChange={(v) => { setUtmMediumFilter(v); setCurrentPage(1); }}
              onUtmCampaignChange={(v) => { setUtmCampaignFilter(v); setCurrentPage(1); }}
              totalFilteredTransactions={filteredTransactions.length}
            />
            
            {/* Search Bar */}
            <div className="flex flex-wrap gap-4 pt-2 border-t">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por produto, cliente, email ou ID..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar Tudo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">ID Pedido</TableHead>
                  <TableHead className="text-xs sm:text-sm">Produto</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Cliente</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Valor</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Data</TableHead>
                  <TableHead className="hidden md:table-cell text-xs sm:text-sm">UTM Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs p-2 sm:p-4">
                      <span className="hidden sm:inline">{transaction.order_id.slice(0, 15)}...</span>
                      <span className="sm:hidden">{transaction.order_id.slice(0, 8)}...</span>
                    </TableCell>
                    <TableCell className="max-w-[120px] sm:max-w-[200px] truncate text-xs sm:text-sm p-2 sm:p-4">
                      {transaction.product || '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                      <div className="max-w-[180px]">
                        <p className="truncate font-medium text-sm">
                          {transaction.buyer_name || '-'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.buyer_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs sm:text-sm p-2 sm:p-4">
                      {formatCurrency(Number(transaction.ticket_value), 'BRL')}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs sm:text-sm p-2 sm:p-4">
                      {transaction.effective_date 
                        ? format(parseISO(transaction.effective_date), 'dd/MM/yy HH:mm', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="hidden md:table-cell p-2 sm:p-4">
                      {transaction.utm_source ? (
                        <Badge variant="outline" className="text-xs">
                          {transaction.utm_source}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 sm:py-12">
                      <FileSpreadsheet className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                      <p className="text-muted-foreground text-sm sm:text-base">
                        {hasActiveFilters 
                          ? 'Nenhuma transação encontrada com os filtros aplicados'
                          : 'Nenhuma transação TMB ainda. Importe um arquivo para começar.'
                        }
                      </p>
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
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
            </p>
            <div className="flex gap-1 sm:gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 sm:h-9 sm:w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 3) {
                    page = i + 1;
                  } else if (currentPage <= 2) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 1) {
                    page = totalPages - 2 + i;
                  } else {
                    page = currentPage - 1 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 sm:h-9 sm:w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default TmbTransactions;
