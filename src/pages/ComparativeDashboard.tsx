import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PlatformComparisonCards } from '@/components/dashboard/PlatformComparisonCards';
import { ComparisonChart } from '@/components/dashboard/ComparisonChart';
import { PlatformSharePieChart } from '@/components/dashboard/PlatformSharePieChart';
import { ExportReportDialog } from '@/components/export/ExportReportDialog';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { CurrencyViewToggle, CurrencyView } from '@/components/dashboard/CurrencyViewToggle';
import { DollarRateIndicator } from '@/components/dashboard/DollarRateIndicator';
import { RestrictedFinancialSection } from '@/components/dashboard/RestrictedFinancialSection';
import { useDollarRate } from '@/hooks/useDollarRate';
import { useFilter } from '@/contexts/FilterContext';
import { useFinancialAccess } from '@/hooks/useFinancialAccess';
import { 
  useTransactionStatsOptimized, 
  useSalesByDateOptimized 
} from '@/hooks/useTransactionStatsOptimized';
import { 
  useTmbTransactionStatsOptimized, 
  useTmbSalesByDateOptimized 
} from '@/hooks/useTmbTransactionStatsOptimized';
import {
  useEduzzTransactionStatsOptimized,
  useEduzzSalesByDateOptimized,
} from '@/hooks/useEduzzTransactionStatsOptimized';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calendar, BarChart3, Download } from 'lucide-react';
import { ActiveClientBlock } from '@/components/layout/ActiveClientBlock';
import { DateRange } from 'react-day-picker';
import { getDateRangeBrasiliaUTC, startOfDayBrasiliaUTC, endOfDayBrasiliaUTC } from '@/lib/dateUtils';

type PeriodFilter = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

function ComparativeDashboard() {
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [currencyView, setCurrencyView] = useState<CurrencyView>('brl-only');
  const { clientId } = useFilter();
  const { canViewFinancials, isLoading: isLoadingFinancialAccess } = useFinancialAccess(clientId);
  const dateRange = useMemo(() => {
    if (period === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: startOfDayBrasiliaUTC(customDateRange.from),
        endDate: endOfDayBrasiliaUTC(customDateRange.to),
      };
    }
    if (period === 'custom') {
      return { startDate: undefined, endDate: undefined };
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return getDateRangeBrasiliaUTC(days);
  }, [period, customDateRange]);

  // Hotmart data
  const { data: hotmartStats, isLoading: loadingHotmartStats } = useTransactionStatsOptimized(dateRange);
  const { data: hotmartSales, isLoading: loadingHotmartSales } = useSalesByDateOptimized(dateRange);

  // TMB data
  const { data: tmbStats, isLoading: loadingTmbStats } = useTmbTransactionStatsOptimized(dateRange);
  const { data: tmbSales, isLoading: loadingTmbSales } = useTmbSalesByDateOptimized(dateRange);

  // Eduzz data
  const { data: eduzzStats, isLoading: loadingEduzzStats } = useEduzzTransactionStatsOptimized(dateRange);
  const { data: eduzzSales, isLoading: loadingEduzzSales } = useEduzzSalesByDateOptimized(dateRange);

  // Dollar rate
  const { data: dollarRate, isLoading: isLoadingRate, isError: isRateError } = useDollarRate();

  const isLoading = loadingHotmartStats || loadingHotmartSales || 
                    loadingTmbStats || loadingTmbSales ||
                    loadingEduzzStats || loadingEduzzSales;

  const hotmartPlatformStats = useMemo(() => {
    if (!hotmartStats) return null;
    return {
      totalBRL: hotmartStats.totalByCurrency?.BRL || 0,
      totalUSD: hotmartStats.totalByCurrency?.USD || 0,
      totalTransactions: hotmartStats.totalTransactions || 0,
    };
  }, [hotmartStats]);

  const tmbPlatformStats = useMemo(() => {
    if (!tmbStats) return null;
    return {
      totalBRL: tmbStats.totalBRL || 0,
      totalTransactions: tmbStats.totalTransactions || 0,
    };
  }, [tmbStats]);

  const eduzzPlatformStats = useMemo(() => {
    if (!eduzzStats) return null;
    return {
      totalBRL: eduzzStats.totalBRL || 0,
      totalTransactions: eduzzStats.totalTransactions || 0,
    };
  }, [eduzzStats]);

  // Calculate pie chart totals with currency conversion
  const hotmartTotalForPie = useMemo(() => {
    const brl = hotmartPlatformStats?.totalBRL || 0;
    const usd = hotmartPlatformStats?.totalUSD || 0;
    if (currencyView === 'brl-only') return brl;
    return brl + (dollarRate ? usd * dollarRate.rate : 0);
  }, [hotmartPlatformStats, dollarRate, currencyView]);

  const eduzzTotalForPie = useMemo(() => {
    return eduzzPlatformStats?.totalBRL || 0;
  }, [eduzzPlatformStats]);

  if (isLoading) {
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-3">
            <ActiveClientBlock />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Análise Comparativa</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                Hotmart vs TMB vs Eduzz — Lado a lado
              </p>
            </div>
          </div>
          
          <ExportReportDialog 
            trigger={
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            }
          />
        </div>

        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-[160px]">
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
                className="w-[260px]"
              />
            )}
            
            <div className="h-6 w-px bg-border hidden sm:block" />
            
            <CurrencyViewToggle value={currencyView} onChange={setCurrencyView} />
            
            <DollarRateIndicator 
              rate={dollarRate?.rate}
              source={dollarRate?.source}
              isLoading={isLoadingRate}
              isError={isRateError}
            />
          </div>
        </motion.div>

        {canViewFinancials ? (
          <>
            {/* Platform Comparison Cards */}
            <PlatformComparisonCards 
              hotmartStats={hotmartPlatformStats} 
              tmbStats={tmbPlatformStats}
              eduzzStats={eduzzPlatformStats}
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ComparisonChart 
                  hotmartData={hotmartSales || {}} 
                  tmbData={tmbSales || {}}
                  eduzzData={eduzzSales || {}}
                />
              </div>
              <div>
                <PlatformSharePieChart 
                  hotmartTotal={hotmartTotalForPie} 
                  tmbTotal={tmbPlatformStats?.totalBRL || 0}
                  eduzzTotal={eduzzTotalForPie}
                />
              </div>
            </div>
          </>
        ) : (
          <RestrictedFinancialSection />
        )}
      </div>
    </MainLayout>
  );
}

export default ComparativeDashboard;
