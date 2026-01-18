import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useTransactionStatsOptimized } from '@/hooks/useTransactionStatsOptimized';
import { useDollarRate } from '@/hooks/useDollarRate';
import { useFilter } from '@/contexts/FilterContext';
import { AdvancedFilters } from '@/components/dashboard/AdvancedFilters';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { format } from 'date-fns';
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
  Calendar
} from 'lucide-react';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { HotmartTransactionDetailDialog } from '@/components/hotmart/HotmartTransactionDetailDialog';
import { BillingTypeBadge } from '@/components/transactions/BillingTypeBadge';
import { SalesByTimeChart } from '@/components/dashboard/SalesByTimeChart';


const ITEMS_PER_PAGE = 20;

type PeriodFilter = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

// Mobile transaction card component
function TransactionCard({ transaction, onClick }: { transaction: Transaction; onClick: () => void }) {
  return (
    <Card className="mb-2 cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{transaction.product || 'Sem produto'}</p>
            <p className="text-xs text-muted-foreground truncate">{transaction.buyer_name || '-'}</p>
          </div>
          <Badge variant="outline" className="ml-2 text-xs shrink-0">{transaction.currency}</Badge>
        </div>
        <div className="flex justify-between items-center mb-2">
          <BillingTypeBadge 
            billingType={transaction.billing_type} 
            paymentMethod={transaction.payment_method}
            showPaymentMethod={false}
          />
        </div>
        <div className="flex justify-between items-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground cursor-help">
                  {transaction.purchase_date 
                    ? formatDateTimeBR(transaction.purchase_date, 'dd/MM/yy HH:mm')
                    : 'Sem data'
                  }
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {transaction.purchase_date 
                    ? formatDateTimeUTC(transaction.purchase_date, 'dd/MM/yyyy HH:mm:ss')
                    : 'Sem data UTC'
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-sm font-semibold text-right">
            {formatCurrency(Number(transaction.computed_value), transaction.currency)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Transactions() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<PeriodFilter>('365d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Advanced filters
  const [billingTypeFilter, setBillingTypeFilter] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | null>(null);
  const [sckCodeFilter, setSckCodeFilter] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);

  // Debounce search to avoid excessive updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);
  
  const { clientId, setClientId } = useFilter();

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
    clientId,
  }), [dateRange, clientId]);

  const { data: transactions, isLoading, error } = useTransactions(filters);
  
  // Use the same optimized stats as the Dashboard for consistent KPI values
  const { data: statsFromDB, isLoading: isLoadingStats } = useTransactionStatsOptimized({ ...filters, clientId });
  
  // Dollar rate for USD → BRL conversion
  const { data: dollarRate } = useDollarRate();

  // Debug logging
  console.log('Transactions state:', { isLoading, count: transactions?.length, error });

  // Get unique currencies and countries for filters
  const { currencies, countries } = useMemo(() => {
    if (!transactions) return { currencies: [], countries: [] };
    
    const currencySet = new Set<string>();
    const countrySet = new Set<string>();
    
    transactions.forEach(t => {
      currencySet.add(t.currency);
      if (t.country) countrySet.add(t.country);
    });
    
    return {
      currencies: Array.from(currencySet).sort(),
      countries: Array.from(countrySet).sort(),
    };
  }, [transactions]);

  // Filter transactions (use debounced search for consistency)
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      const matchesSearch = !debouncedSearch || 
        t.product?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.buyer_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.buyer_email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.transaction_code.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesCurrency = currencyFilter === 'all' || t.currency === currencyFilter;
      const matchesCountry = countryFilter === 'all' || t.country === countryFilter;
      
      // Advanced filters
      const matchesBillingType = !billingTypeFilter || t.billing_type === billingTypeFilter;
      const matchesPaymentMethod = !paymentMethodFilter || t.payment_method === paymentMethodFilter;
      const matchesSckCode = !sckCodeFilter || t.sck_code === sckCodeFilter;
      const matchesProduct = !productFilter || t.product === productFilter;
      
      return matchesSearch && matchesCurrency && matchesCountry && 
             matchesBillingType && matchesPaymentMethod && matchesSckCode && matchesProduct;
    });
  }, [transactions, debouncedSearch, currencyFilter, countryFilter, billingTypeFilter, paymentMethodFilter, sckCodeFilter, productFilter]);

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  // Summary stats for KPI cards - using deduplicated values from DB for consistency with Dashboard
  const summaryStats = useMemo(() => {
    // Use deduplicated totals from DB (same as Dashboard)
    const totalBRL = statsFromDB?.totalByCurrency?.['BRL'] || 0;
    const totalUSD = statsFromDB?.totalByCurrency?.['USD'] || 0;
    
    // Convert USD to BRL using current rate
    const usdConvertedToBRL = dollarRate ? totalUSD * dollarRate.rate : 0;
    const totalCombinedBRL = totalBRL + usdConvertedToBRL;
    
    // Keep counts from filtered transactions for display reference
    const brlTransactions = filteredTransactions.filter(t => t.currency === 'BRL');
    const usdTransactions = filteredTransactions.filter(t => t.currency === 'USD');

    return {
      totalBRL,
      totalUSD,
      totalCombinedBRL,
      usdConvertedToBRL,
      countBRL: brlTransactions.length,
      countUSD: usdTransactions.length,
    };
  }, [statsFromDB, filteredTransactions, dollarRate]);

  // Chart data - aggregate sales by date for the chart
  const salesByDateData = useMemo(() => {
    if (!filteredTransactions) return {};
    
    return filteredTransactions.reduce((acc, t) => {
      if (t.purchase_date) {
        const date = t.purchase_date.split('T')[0];
        if (!acc[date]) {
          acc[date] = {};
        }
        acc[date][t.currency] = (acc[date][t.currency] || 0) + Number(t.computed_value);
      }
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }, [filteredTransactions]);

  // Get unique currencies for the chart
  const chartCurrencies = useMemo(() => {
    const currencySet = new Set<string>();
    filteredTransactions.forEach(t => currencySet.add(t.currency));
    return Array.from(currencySet).sort((a, b) => {
      // BRL first, then USD, then others
      if (a === 'BRL') return -1;
      if (b === 'BRL') return 1;
      if (a === 'USD') return -1;
      if (b === 'USD') return 1;
      return a.localeCompare(b);
    });
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    const headers = ['Código', 'Produto', 'Comprador', 'Email', 'Moeda', 'País', 'Valor', 'Data'];
    const rows = filteredTransactions.map(t => [
      t.transaction_code,
      t.product || '',
      t.buyer_name || '',
      t.buyer_email || '',
      t.currency,
      t.country || '',
      t.computed_value,
      t.purchase_date ? formatDateTimeBR(t.purchase_date, 'dd/MM/yyyy HH:mm') : '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSearch('');
    setCurrencyFilter('all');
    setCountryFilter('all');
    setBillingTypeFilter(null);
    setPaymentMethodFilter(null);
    setSckCodeFilter(null);
    setProductFilter(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = search || currencyFilter !== 'all' || countryFilter !== 'all' || 
                           billingTypeFilter || paymentMethodFilter || sckCodeFilter || productFilter;

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
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <ClientContextHeader 
            title="Transações"
            description={`${filteredTransactions.length} transações encontradas`}
          />
          <Button variant="outline" onClick={handleExportCSV} size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </motion.div>

        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-2"
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Período:</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {(['7d', '30d', '90d', '365d', 'all'] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
              >
                {p === 'all' ? 'Tudo' : p}
              </Button>
            ))}
            <DateRangePicker
              dateRange={customDateRange}
              onDateRangeChange={(range) => {
                setCustomDateRange(range);
                setPeriod('custom');
              }}
              className={period === 'custom' ? 'ring-2 ring-primary ring-offset-2' : ''}
            />
          </div>
        </motion.div>

        {/* Summary KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4"
        >
          <ColoredKPICard
            title="Faturamento Total (BRL)"
            value={formatCurrency(summaryStats.totalCombinedBRL, 'BRL')}
            subtitle={summaryStats.totalUSD > 0 && dollarRate 
              ? `Inclui ${formatCurrency(summaryStats.totalUSD, 'USD')} convertidos (R$ ${dollarRate.rate.toFixed(2)})`
              : `${summaryStats.countBRL} transações`
            }
            icon={DollarSign}
            variant="green"
            delay={0}
            className="text-sm sm:text-base"
          />
          {summaryStats.totalUSD > 0 && (
            <ColoredKPICard
              title="Vendas em Dólares"
              value={formatCurrency(summaryStats.totalUSD, 'USD')}
              subtitle={dollarRate 
                ? `≈ ${formatCurrency(summaryStats.usdConvertedToBRL, 'BRL')} (R$ ${dollarRate.rate.toFixed(2)})`
                : `${summaryStats.countUSD} transações`
              }
              icon={DollarSign}
              variant="blue"
              delay={1}
              className="text-sm sm:text-base"
            />
          )}
          <ColoredKPICard
            title="Total de Transações"
            value={filteredTransactions.length.toString()}
            subtitle="no período filtrado"
            icon={Receipt}
            variant="purple"
            delay={2}
            className={summaryStats.totalUSD > 0 ? "text-sm sm:text-base" : "col-span-2 sm:col-span-1 text-sm sm:text-base"}
          />
        </motion.div>

        {/* Sales Evolution Chart */}
        {Object.keys(salesByDateData).length > 0 && chartCurrencies.length > 0 && (
          <SalesByTimeChart 
            data={salesByDateData} 
            currencies={chartCurrencies}
          />
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:px-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto, cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={currencyFilter} onValueChange={(v) => { setCurrencyFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[100px] sm:w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Moeda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {currencies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[100px] sm:w-[160px] h-9 text-sm">
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {countries.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Advanced Filters */}
            <AdvancedFilters
              billingType={billingTypeFilter}
              paymentMethod={paymentMethodFilter}
              sckCode={sckCodeFilter}
              product={productFilter}
              onBillingTypeChange={setBillingTypeFilter}
              onPaymentMethodChange={setPaymentMethodFilter}
              onSckCodeChange={setSckCodeFilter}
              onProductChange={setProductFilter}
              totalFilteredTransactions={filteredTransactions.length}
            />
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
                    : 'Nenhuma transação ainda. Importe uma planilha para começar.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedTransactions.map((transaction) => (
              <TransactionCard 
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Código</TableHead>
                    <TableHead className="min-w-[150px]">Produto</TableHead>
                    <TableHead className="min-w-[150px]">Comprador</TableHead>
                    <TableHead className="min-w-[100px]">Tipo</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead className="hidden lg:table-cell">País</TableHead>
                    <TableHead className="text-right min-w-[100px]">Valor</TableHead>
                    <TableHead className="min-w-[100px]">Data (BRT)</TableHead>
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
                      <TableCell className="font-mono text-xs">
                        {transaction.transaction_code.slice(0, 12)}...
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
                      <TableCell>
                        <BillingTypeBadge 
                          billingType={transaction.billing_type} 
                          paymentMethod={transaction.payment_method}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.currency}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{transaction.country || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(transaction.computed_value), transaction.currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {transaction.purchase_date 
                                  ? formatDateTimeBR(transaction.purchase_date, 'dd/MM/yy HH:mm')
                                  : '-'
                                }
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {transaction.purchase_date 
                                  ? formatDateTimeUTC(transaction.purchase_date, 'dd/MM/yyyy HH:mm:ss')
                                  : 'Sem data UTC'
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {hasActiveFilters 
                            ? 'Nenhuma transação encontrada com os filtros aplicados'
                            : 'Nenhuma transação ainda. Importe uma planilha para começar.'
                          }
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
            </p>
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
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
                      className="h-8 w-8 p-0 sm:h-9 sm:w-9 text-xs sm:text-sm"
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
                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Detail Dialog */}
        <HotmartTransactionDetailDialog
          transaction={selectedTransaction}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      </div>
    </MainLayout>
  );
}

export default Transactions;
