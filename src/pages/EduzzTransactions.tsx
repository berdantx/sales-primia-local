import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useEduzzTransactions, EduzzTransaction } from '@/hooks/useEduzzTransactions';
import { useEduzzTransactionStatsOptimized } from '@/hooks/useEduzzTransactionStatsOptimized';
import { useFilter } from '@/contexts/FilterContext';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { format, parseISO } from 'date-fns';
import { getDateRangeBrasiliaUTC, startOfDayBrasiliaUTC, endOfDayBrasiliaUTC, formatDateTimeBR, formatDateTimeUTC } from '@/lib/dateUtils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { EduzzTransactionDetailDialog } from '@/components/eduzz/EduzzTransactionDetailDialog';
import { EduzzTransactionCard } from '@/components/eduzz/EduzzTransactionCard';
import { EduzzAdvancedFilters } from '@/components/dashboard/EduzzAdvancedFilters';
import { SalesByDayChart, SalesValueMode } from '@/components/sales/SalesByDayChart';
import { SalesTrendChart } from '@/components/sales/SalesTrendChart';
import { TopSalesCard } from '@/components/sales/TopSalesCard';
import { useTopSales, SalesViewMode } from '@/hooks/useTopSales';
import { SalesGroupBy } from '@/hooks/useSalesTrend';

const ITEMS_PER_PAGE = 20;

type PeriodFilter = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

function EduzzTransactions() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<PeriodFilter>('365d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [selectedTransaction, setSelectedTransaction] = useState<EduzzTransaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Sort state
  const [sortColumn, setSortColumn] = useState<'date' | 'value' | 'product'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Advanced filters
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [utmSourceFilter, setUtmSourceFilter] = useState<string | null>(null);
  const [utmMediumFilter, setUtmMediumFilter] = useState<string | null>(null);
  const [utmCampaignFilter, setUtmCampaignFilter] = useState<string | null>(null);
  
  // Analytics state
  const [topMode, setTopMode] = useState<SalesViewMode>('products');
  const [trendGroupBy, setTrendGroupBy] = useState<SalesGroupBy>('day');
  const [chartTab, setChartTab] = useState<'daily' | 'evolution'>('daily');
  const [chartValueMode, setChartValueMode] = useState<SalesValueMode>('count');
  const [trendValueMode, setTrendValueMode] = useState<'count' | 'value'>('count');
  const [selectedTopItem, setSelectedTopItem] = useState<string | null>(null);

  // Debounce search to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const { clientId } = useFilter();

  const dateRange = useMemo(() => {
    if (period === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
      return { 
        startDate: startOfDayBrasiliaUTC(customDateRange.from), 
        endDate: endOfDayBrasiliaUTC(customDateRange.to) 
      };
    }
    if (period === 'custom') {
      return { startDate: undefined, endDate: undefined };
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return getDateRangeBrasiliaUTC(days);
  }, [period, customDateRange]);

  const filters = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    search: debouncedSearch || undefined,
    clientId,
  }), [dateRange, debouncedSearch, clientId]);

  const { data: transactions, isLoading } = useEduzzTransactions(filters);
  const { data: stats, isLoading: isLoadingStats } = useEduzzTransactionStatsOptimized({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    clientId,
  });

  // Filter transactions by search and advanced filters (use debounced for consistency)
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      // Text search
      if (debouncedSearch) {
        const lowerSearch = debouncedSearch.toLowerCase();
        const matchesSearch = 
          t.product?.toLowerCase().includes(lowerSearch) ||
          t.buyer_name?.toLowerCase().includes(lowerSearch) ||
          t.buyer_email?.toLowerCase().includes(lowerSearch) ||
          t.sale_id.toLowerCase().includes(lowerSearch);
        if (!matchesSearch) return false;
      }
      
      // Advanced filters
      if (productFilter && t.product !== productFilter) return false;
      if (utmSourceFilter && t.utm_source !== utmSourceFilter) return false;
      if (utmMediumFilter && t.utm_medium !== utmMediumFilter) return false;
      if (utmCampaignFilter && t.utm_campaign !== utmCampaignFilter) return false;
      
      // Filter by selected top item
      if (selectedTopItem) {
        if (topMode === 'products' && t.product !== selectedTopItem) return false;
        if (topMode === 'campaigns' && t.utm_campaign !== selectedTopItem) return false;
      }
      
      return true;
    });
  }, [transactions, debouncedSearch, productFilter, utmSourceFilter, utmMediumFilter, utmCampaignFilter, selectedTopItem, topMode]);

  // Top sales hook
  const { topItems, totalCount } = useTopSales({
    transactions: filteredTransactions,
    mode: topMode,
    productField: 'product',
    campaignField: 'utm_campaign',
    valueField: 'sale_value',
  });
  const topItemNames = useMemo(() => topItems.map(item => item.name), [topItems]);

  // Sales by day data
  const salesByDay = useMemo(() => {
    if (!filteredTransactions) return {};
    
    const groups: Record<string, { count: number; value: number }> = {};
    filteredTransactions.forEach(t => {
      if (!t.sale_date) return;
      try {
        const dateStr = t.sale_date.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
        const date = format(parseISO(dateStr), 'yyyy-MM-dd');
        if (!groups[date]) {
          groups[date] = { count: 0, value: 0 };
        }
        groups[date].count++;
        groups[date].value += Number(t.sale_value) || 0;
      } catch {
        // Skip invalid dates
      }
    });
    return groups;
  }, [filteredTransactions]);

  // Handle mode change - reset selected item
  const handleTopModeChange = (mode: SalesViewMode) => {
    setTopMode(mode);
    setSelectedTopItem(null);
  };

  // Sort and paginate
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'date':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'value':
          comparison = Number(a.sale_value) - Number(b.sale_value);
          break;
        case 'product':
          const productA = (a.product || '').toLowerCase();
          const productB = (b.product || '').toLowerCase();
          comparison = productA.localeCompare(productB);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [filteredTransactions, sortColumn, sortOrder]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  
  const handleSort = (column: 'date' | 'value' | 'product') => {
    if (sortColumn === column) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };
  
  const SortIcon = ({ column }: { column: 'date' | 'value' | 'product' }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  const handleExportCSV = () => {
    const headers = ['ID Venda', 'Produto', 'Cliente', 'Email', 'Telefone', 'Valor', 'Data', 'UTM Source', 'UTM Medium', 'UTM Campaign'];
    const rows = filteredTransactions.map(t => [
      t.sale_id,
      t.product || '',
      t.buyer_name || '',
      t.buyer_email || '',
      t.buyer_phone || '',
      t.sale_value,
      t.sale_date ? formatDateTimeBR(t.sale_date, 'dd/MM/yyyy HH:mm') : '',
      t.utm_source || '',
      t.utm_medium || '',
      t.utm_campaign || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduzz-transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
          <ClientContextHeader 
            title="Transações Eduzz"
            description={`${filteredTransactions.length} transações encontradas`}
          />
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </motion.div>

        {/* Summary KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4"
        >
          <ColoredKPICard
            title="Faturamento Total (BRL)"
            value={formatCurrency(stats?.totalBRL || 0, 'BRL')}
            subtitle={`${stats?.totalTransactions || 0} transações`}
            icon={DollarSign}
            variant="green"
            delay={0}
            className="text-sm sm:text-base"
          />
          <ColoredKPICard
            title="Total de Transações"
            value={(stats?.totalTransactions || 0).toString()}
            subtitle="no período filtrado"
            icon={Receipt}
            variant="purple"
            delay={1}
            className="text-sm sm:text-base"
          />
        </motion.div>

        {/* Chart + Top Sales Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <div className="lg:col-span-2 h-[420px]">
            <Card className="h-full flex flex-col">
              <Tabs value={chartTab} onValueChange={(v) => setChartTab(v as 'daily' | 'evolution')} className="flex flex-col h-full">
                <div className="px-4 pt-4 pb-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="daily" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Vendas por Dia</span>
                      <span className="sm:hidden">Por Dia</span>
                    </TabsTrigger>
                    <TabsTrigger value="evolution" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Evolução {topMode === 'products' ? 'Produtos' : 'Campanhas'}</span>
                      <span className="sm:hidden">Evolução</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                <CardContent className="pt-2 flex-1 overflow-hidden">
                  <TabsContent value="daily" className="mt-0 h-full">
                    <SalesByDayChart 
                      data={salesByDay} 
                      isLoading={isLoading} 
                      embedded
                      valueMode={chartValueMode}
                      onValueModeChange={setChartValueMode}
                      currency="BRL"
                    />
                  </TabsContent>
                  <TabsContent value="evolution" className="mt-0 h-full">
                    <SalesTrendChart
                      transactions={filteredTransactions}
                      topItemNames={topItemNames}
                      mode={topMode}
                      groupBy={trendGroupBy}
                      onGroupByChange={setTrendGroupBy}
                      isLoading={isLoading}
                      embedded
                      dateField="sale_date"
                      productField="product"
                      campaignField="utm_campaign"
                      valueField="sale_value"
                      valueMode={trendValueMode}
                      onValueModeChange={setTrendValueMode}
                    />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
          <div className="lg:col-span-1 h-[420px]">
            <TopSalesCard
              topItems={topItems}
              totalCount={totalCount}
              isLoading={isLoading}
              mode={topMode}
              onModeChange={handleTopModeChange}
              selectedItem={selectedTopItem}
              onItemClick={(item) => {
                setSelectedTopItem(item);
                setCurrentPage(1);
              }}
              showOrigins={false}
              currency="BRL"
            />
          </div>
        </motion.div>

        {/* Selected Filter Indicator */}
        {selectedTopItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Badge variant="secondary" className="gap-2 px-3 py-1.5">
              Filtrado por {topMode === 'products' ? 'produto' : 'campanha'}: {selectedTopItem}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => setSelectedTopItem(null)}
              />
            </Badge>
          </motion.div>
        )}
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
            <EduzzAdvancedFilters
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
                    onChange={(e) => setSearch(e.target.value)}
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

        {/* Mobile: Card View */}
        <div className="md:hidden">
          {paginatedTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">
                  {hasActiveFilters 
                    ? 'Nenhuma transação encontrada com os filtros aplicados'
                    : 'Nenhuma transação Eduzz ainda. Importe um arquivo para começar.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedTransactions.map((transaction) => (
              <EduzzTransactionCard 
                key={transaction.id} 
                transaction={transaction} 
                onClick={() => {
                  setSelectedTransaction(transaction);
                  setIsDetailOpen(true);
                }}
              />
            ))
          )}
        </div>

        {/* Desktop: Table View */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="min-w-[100px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Registro (BRT)
                      <SortIcon column="date" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]">ID Venda</TableHead>
                  <TableHead 
                    className="min-w-[150px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('product')}
                  >
                    <div className="flex items-center gap-1">
                      Produto
                      <SortIcon column="product" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[150px]">Cliente</TableHead>
                  <TableHead 
                    className="text-right min-w-[100px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('value')}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Valor
                      <SortIcon column="value" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">UTM Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setIsDetailOpen(true);
                    }}
                  >
                    <TableCell className="text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {transaction.created_at 
                                ? formatDateTimeBR(transaction.created_at, 'dd/MM/yy HH:mm')
                                : '-'
                              }
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-1">
                              <p>Registro: {transaction.created_at ? formatDateTimeUTC(transaction.created_at, 'dd/MM/yyyy HH:mm:ss') : '-'}</p>
                              <p className="text-muted-foreground">Venda: {transaction.sale_date ? formatDateTimeUTC(transaction.sale_date, 'dd/MM/yyyy HH:mm:ss') : '-'}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {transaction.sale_id.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.product || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="truncate font-medium text-sm">
                          {transaction.buyer_name || '-'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.buyer_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(transaction.sale_value), 'BRL')}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {hasActiveFilters 
                          ? 'Nenhuma transação encontrada com os filtros aplicados'
                          : 'Nenhuma transação Eduzz ainda. Importe um arquivo para começar.'
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
                      className="h-8 w-8 p-0 sm:h-9 sm:w-9"
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

        {/* Transaction Detail Dialog */}
        <EduzzTransactionDetailDialog
          transaction={selectedTransaction}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      </div>
    </MainLayout>
  );
}

export default EduzzTransactions;
