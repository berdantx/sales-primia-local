import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { useCombinedStats, PlatformType } from '@/hooks/useCombinedStats';
import { useActiveGoals } from '@/hooks/useGoals';
import { useDollarRate } from '@/hooks/useDollarRate';
import { useFilter } from '@/contexts/FilterContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesByTimeChart } from '@/components/dashboard/SalesByTimeChart';
import { TopCustomers } from '@/components/dashboard/TopCustomers';
import { GoalSummarySection } from '@/components/dashboard/GoalSummarySection';
import { GoalProgressBar } from '@/components/dashboard/GoalProgressBar';
import { ProjectionCards } from '@/components/dashboard/ProjectionCards';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { SavedFilterViews } from '@/components/dashboard/SavedFilterViews';
import { PlatformFilter } from '@/components/dashboard/PlatformFilter';
import { PlatformSharePieChart } from '@/components/dashboard/PlatformSharePieChart';
import { CurrencyViewToggle, CurrencyView } from '@/components/dashboard/CurrencyViewToggle';
import { DollarRateIndicator } from '@/components/dashboard/DollarRateIndicator';
import { FilterView } from '@/hooks/useFilterViews';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatNumber, GoalProgress, calculateGoalProgress } from '@/lib/calculations/goalCalculations';
import { 
  DollarSign, 
  ShoppingCart, 
  Upload,
  Target,
  Loader2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { subDays, parseISO } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PeriodFilter = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [platform, setPlatform] = useState<PlatformType>('all');
  
  // Get filters from global context
  const { billingType, paymentMethod, sckCode, product, setBillingType, setPaymentMethod, setSckCode, setProduct } = useFilter();
  
  // Selected view
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  
  // Currency view toggle
  const [currencyView, setCurrencyView] = useState<CurrencyView>('combined');

  const handleSelectView = (view: FilterView) => {
    setSelectedViewId(view.id);
    setPeriod(view.period as PeriodFilter);
    
    if (view.period === 'custom' && view.custom_date_start && view.custom_date_end) {
      setCustomDateRange({
        from: parseISO(view.custom_date_start),
        to: parseISO(view.custom_date_end),
      });
    } else {
      setCustomDateRange(undefined);
    }
    
    setBillingType(view.billing_type);
    setPaymentMethod(view.payment_method);
    setSckCode(view.sck_code);
    setProduct(view.product || null);
  };

  const handleClearView = () => {
    setSelectedViewId(null);
  };

  const dateRange = useMemo(() => {
    if (period === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: customDateRange.from,
        endDate: customDateRange.to,
      };
    }
    if (period === 'custom') {
      return { startDate: undefined, endDate: undefined };
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return {
      startDate: subDays(new Date(), days),
      endDate: new Date(),
    };
  }, [period, customDateRange]);

  // Build complete filters object
  const filters = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    billingType,
    paymentMethod,
    sckCode,
    product,
  }), [dateRange, billingType, paymentMethod, sckCode, product]);

  // Use combined stats hook that handles platform switching
  const { stats, topCustomers, salesByDate, currencies, isLoading, hotmartStats, tmbStats } = useCombinedStats(filters, platform);
  
  // Fetch dollar rate for USD conversion
  const { data: dollarRate, isLoading: isLoadingRate, isError: isRateError } = useDollarRate();
  
  // Calculate platform totals for pie chart - include USD converted to BRL
  const hotmartBRL = hotmartStats?.totalByCurrency?.['BRL'] || 0;
  const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
  const hotmartTotalBRL = currencyView === 'brl-only' 
    ? hotmartBRL 
    : hotmartBRL + (dollarRate ? hotmartUSD * dollarRate.rate : 0);
  const tmbTotalBRL = tmbStats?.totalBRL || 0;

  const { activeGoals } = useActiveGoals();

  
  
  // Get the first active goal for the summary section
  const primaryGoal = activeGoals[0];
  // For BRL goals, include USD sales converted at current rate
  const primaryGoalSales = useMemo(() => {
    if (!primaryGoal) return 0;
    const baseSales = stats?.totalByCurrency?.[primaryGoal.currency] || 0;
    if (primaryGoal.currency === 'BRL' && dollarRate) {
      const usdSales = stats?.totalByCurrency?.['USD'] || 0;
      return baseSales + (usdSales * dollarRate.rate);
    }
    return baseSales;
  }, [primaryGoal, stats, dollarRate]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const hasData = stats && stats.totalTransactions > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:gap-4 pb-2"
        >
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projeção de Faturamento</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Acompanhe suas metas e desempenho financeiro
            </p>
          </div>
          
          {/* Period and Platform Selectors - Mobile: acima dos botões */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-xl border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs sm:text-sm bg-background">
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
            </div>
            
            {period === 'custom' && (
              <DateRangePicker
                dateRange={customDateRange}
                onDateRangeChange={setCustomDateRange}
                className="w-full sm:w-[240px]"
              />
            )}
            
            <div className="h-px w-full sm:h-6 sm:w-px bg-border" />
            
            <PlatformFilter value={platform} onChange={setPlatform} />
            
            <div className="h-px w-full sm:h-6 sm:w-px bg-border" />
            
            <CurrencyViewToggle value={currencyView} onChange={setCurrencyView} />
            
            <DollarRateIndicator 
              rate={dollarRate?.rate}
              source={dollarRate?.source}
              isLoading={isLoadingRate}
              isError={isRateError}
            />
          </div>
          
        </motion.div>

        {/* Goal Summary Section (only colored cards + period info) */}
        {primaryGoal && hasData && (
          <GoalSummarySection 
            goal={primaryGoal} 
            totalSold={primaryGoalSales}
          />
        )}

        {/* Currency and Transaction KPI Cards - right below goal cards */}
        {hasData && (() => {
          const brlTotal = stats?.totalByCurrency?.['BRL'] || 0;
          const usdTotal = stats?.totalByCurrency?.['USD'] || 0;
          const usdConvertedToBRL = dollarRate ? usdTotal * dollarRate.rate : 0;
          const totalCombinedBRL = brlTotal + usdConvertedToBRL;
          
          // Combined view: single card with BRL + USD converted
          if (currencyView === 'combined') {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                <KPICard
                  title="Faturamento Total (BRL)"
                  value={formatCurrency(totalCombinedBRL, 'BRL')}
                  subtitle={usdTotal > 0 && dollarRate ? 
                    `Inclui ${formatCurrency(usdTotal, 'USD')} (R$ ${dollarRate.rate.toFixed(2)})` : 
                    undefined
                  }
                  icon={DollarSign}
                  delay={0}
                />
                {usdTotal > 0 && (
                  <KPICard
                    title="Vendas em Dólares"
                    value={formatCurrency(usdTotal, 'USD')}
                    subtitle={dollarRate ? 
                      `≈ ${formatCurrency(usdConvertedToBRL, 'BRL')}` : 
                      undefined
                    }
                    icon={DollarSign}
                    delay={1}
                  />
                )}
                <KPICard
                  title="Total Transações"
                  value={formatNumber(stats.totalTransactions)}
                  icon={ShoppingCart}
                  delay={2}
                />
              </div>
            );
          }
          
          // BRL-only view: single card with just BRL
          if (currencyView === 'brl-only') {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <KPICard
                  title="Vendas em Reais"
                  value={formatCurrency(brlTotal, 'BRL')}
                  icon={DollarSign}
                  delay={0}
                />
                <KPICard
                  title="Total Transações"
                  value={formatNumber(stats.totalTransactions)}
                  icon={ShoppingCart}
                  delay={1}
                />
              </div>
            );
          }
          
          // Separated view: separate cards for each currency
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
              <KPICard
                title="Vendas em Reais"
                value={formatCurrency(brlTotal, 'BRL')}
                icon={DollarSign}
                delay={0}
              />
              {usdTotal > 0 && (
                <KPICard
                  title="Vendas em Dólares"
                  value={formatCurrency(usdTotal, 'USD')}
                  subtitle={dollarRate ? 
                    `≈ ${formatCurrency(usdConvertedToBRL, 'BRL')}` : 
                    undefined
                  }
                  icon={DollarSign}
                  delay={1}
                />
              )}
              <KPICard
                title="Total Transações"
                value={formatNumber(stats.totalTransactions)}
                icon={ShoppingCart}
                delay={2}
              />
            </div>
          );
        })()}

        {/* Goal Progress Bar - after white KPI cards */}
        {primaryGoal && hasData && (() => {
          const progress = calculateGoalProgress(primaryGoal, primaryGoalSales);
          return (
            <>
              <GoalProgressBar goal={primaryGoal} progress={progress} />
              {progress.remaining > 0 && (
                <ProjectionCards progress={progress} currency={primaryGoal.currency} />
              )}
            </>
          );
        })()}

        {/* Saved Filter Views */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="p-2 sm:p-3 bg-muted/20 rounded-lg border overflow-x-auto"
        >
          <SavedFilterViews
            currentPeriod={period}
            currentCustomDateRange={customDateRange}
            currentBillingType={billingType}
            currentPaymentMethod={paymentMethod}
            currentSckCode={sckCode}
            selectedViewId={selectedViewId}
            onSelectView={handleSelectView}
            onClearView={handleClearView}
          />
        </motion.div>

        {/* Warning for transactions without date */}
        {period !== 'all' && stats && stats.transactionsWithoutDate > 0 && (
          <Alert variant="default" className="border-warning/50 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              <strong>{stats.transactionsWithoutDate} transações</strong> não têm data registrada e não aparecem no filtro atual.{' '}
              <button 
                onClick={() => setPeriod('all')} 
                className="underline font-medium hover:no-underline"
              >
                Ver todas as transações
              </button>
            </AlertDescription>
          </Alert>
        )}

        {!hasData ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <Upload className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma transação ainda</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Importe sua primeira planilha de vendas Hotmart para começar a visualizar 
              seus KPIs, gráficos e acompanhar suas metas.
            </p>
            <Button size="lg" onClick={() => navigate('/upload')}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Planilha
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Call to action for creating a goal - only when no goal exists */}
            {!primaryGoal && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Crie uma meta de faturamento</p>
                    <p className="text-sm text-muted-foreground">
                      Acompanhe seu progresso com cards coloridos e projeções automáticas
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('/goals')}>
                  <Target className="h-4 w-4 mr-2" />
                  Criar Meta
                </Button>
              </motion.div>
            )}

            {/* Charts Row - 2/3 + 1/3 layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main chart - 2/3 width */}
              <div className="lg:col-span-2 min-w-0">
                <SalesByTimeChart 
                  data={salesByDate || {}} 
                  currencies={currencies}
                />
              </div>
              
              {/* Secondary chart - 1/3 width */}
              <div className="flex flex-col h-full min-w-0">
                {(hotmartTotalBRL > 0 || tmbTotalBRL > 0) && (
                  <PlatformSharePieChart 
                    hotmartTotal={hotmartTotalBRL} 
                    tmbTotal={tmbTotalBRL} 
                  />
                )}
              </div>
            </div>

            {/* Top Customers */}
            <TopCustomers customers={topCustomers || []} />
          </>
        )}
      </div>
    </MainLayout>
  );
}
