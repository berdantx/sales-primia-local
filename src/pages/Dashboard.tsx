import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { useCombinedStats, PlatformType } from '@/hooks/useCombinedStats';
import { useActiveGoals } from '@/hooks/useGoals';
import { useDollarRate } from '@/hooks/useDollarRate';
import { useLeadCount } from '@/hooks/useLeads';
import { useSalesBreakdown, useProjectionStats } from '@/hooks/useSalesBreakdown';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { useFinancialAccess } from '@/hooks/useFinancialAccess';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { ColoredDashboardCards } from '@/components/dashboard/ColoredDashboardCards';
import { SalesByTimeChart } from '@/components/dashboard/SalesByTimeChart';
import { SalesBreakdownDialog } from '@/components/dashboard/SalesBreakdownDialog';
import { DashboardSalesAnalytics } from '@/components/dashboard/DashboardSalesAnalytics';
import { RestrictedFinancialSection } from '@/components/dashboard/RestrictedFinancialSection';

import { TopCustomers } from '@/components/dashboard/TopCustomers';

import { GoalSummarySection } from '@/components/dashboard/GoalSummarySection';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { SavedFilterViews } from '@/components/dashboard/SavedFilterViews';
import { PlatformFilter } from '@/components/dashboard/PlatformFilter';
import { PlatformSharePieChart } from '@/components/dashboard/PlatformSharePieChart';
import { CurrencyViewToggle, CurrencyView } from '@/components/dashboard/CurrencyViewToggle';
import { DollarRateIndicator } from '@/components/dashboard/DollarRateIndicator';
import { FilterView } from '@/hooks/useFilterViews';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { 
  DollarSign, 
  ShoppingCart, 
  Upload,
  Target,
  Loader2,
  Calendar,
  AlertTriangle,
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { getDateRangeBrasiliaUTC, startOfDayBrasiliaUTC, endOfDayBrasiliaUTC } from '@/lib/dateUtils';
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
  const { billingType, paymentMethod, sckCode, product, clientId, setClientId, setBillingType, setPaymentMethod, setSckCode, setProduct } = useFilter();
  const { data: clients } = useClients();
  
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

  // Build complete filters object
  const filters = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    billingType,
    paymentMethod,
    sckCode,
    product,
    clientId,
  }), [dateRange, billingType, paymentMethod, sckCode, product, clientId]);

  // Use combined stats hook that handles platform switching
  const { stats, topCustomers, salesByDate, currencies, isLoading, hotmartStats, tmbStats, eduzzStats } = useCombinedStats(filters, platform);
  
  // Check financial access
  const { canViewFinancials, isLoading: isLoadingAccess } = useFinancialAccess(clientId);
  
  // Fetch dollar rate for USD conversion
  const { data: dollarRate, isLoading: isLoadingRate, isError: isRateError } = useDollarRate();
  
  // Fetch lead count for the period
  const { data: leadCount } = useLeadCount({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    clientId,
  });
  
  // Fetch sales breakdown by type and projection stats
  const { data: salesBreakdown, isLoading: isLoadingBreakdown } = useSalesBreakdown({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    clientId,
  });
  
  const { data: projectionStats } = useProjectionStats({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    clientId,
  });
  
  // Calculate platform totals for pie chart - include USD converted to BRL
  const hotmartBRL = hotmartStats?.totalByCurrency?.['BRL'] || 0;
  const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
  const hotmartTotalBRL = currencyView === 'brl-only' 
    ? hotmartBRL 
    : hotmartBRL + (dollarRate ? hotmartUSD * dollarRate.rate : 0);
  const tmbTotalBRL = tmbStats?.totalBRL || 0;
  const eduzzTotalBRL = eduzzStats?.totalBRL || 0;

  const { activeGoals } = useActiveGoals(clientId);

  
  
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

  // Calculate projection value and platform breakdown for GoalSummarySection
  const { projectionValueForGoal, platformBreakdown } = useMemo(() => {
    if (!primaryGoal) return { projectionValueForGoal: 0, platformBreakdown: undefined };
    
    const hotmartRealBRL = projectionStats?.totalRealBRL || (hotmartStats?.totalByCurrency?.['BRL'] || 0);
    const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
    const hotmartProjectedBRL = projectionStats?.totalProjectedBRL || hotmartRealBRL;
    const hotmartPendingBRL = hotmartProjectedBRL - hotmartRealBRL; // Valor a receber
    const tmbBRL = tmbStats?.totalBRL || 0;
    const eduzzBRL = eduzzStats?.totalBRL || 0;
    const combinedProjectedBRL = hotmartProjectedBRL + tmbBRL + eduzzBRL;
    const usdConvertedToBRL = dollarRate ? hotmartUSD * dollarRate.rate : 0;
    
    return {
      projectionValueForGoal: combinedProjectedBRL + usdConvertedToBRL,
      platformBreakdown: {
        hotmartBRL: hotmartRealBRL,
        hotmartPendingBRL,
        hotmartUSD,
        tmbBRL,
        eduzzBRL,
        usdConvertedBRL: usdConvertedToBRL,
      },
    };
  }, [primaryGoal, projectionStats, hotmartStats, tmbStats, eduzzStats, dollarRate]);

  // Calculate transaction counts by platform
  const transactionCounts = useMemo(() => ({
    hotmart: hotmartStats?.totalTransactions || 0,
    tmb: tmbStats?.totalTransactions || 0,
    eduzz: eduzzStats?.totalTransactions || 0,
    total: (hotmartStats?.totalTransactions || 0) + 
           (tmbStats?.totalTransactions || 0) + 
           (eduzzStats?.totalTransactions || 0),
  }), [hotmartStats, tmbStats, eduzzStats]);

  if (isLoading || isLoadingAccess) {
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
          <ClientContextHeader 
            title="Faturamento"
            description="Acompanhe suas metas e desempenho financeiro"
          />
          
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
            
            {canViewFinancials && (
              <div className="flex items-center gap-2">
                <CurrencyViewToggle value={currencyView} onChange={setCurrencyView} />
                
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Cotação do dólar hoje:
                </span>
                <DollarRateIndicator 
                  rate={dollarRate?.rate}
                  source={dollarRate?.source}
                  isLoading={isLoadingRate}
                  isError={isRateError}
                />
              </div>
            )}
          </div>
          
        </motion.div>

        {/* Goal Summary Section (when goal is active) - Above filters */}
        {canViewFinancials && primaryGoal && hasData && (
          <GoalSummarySection 
            goal={primaryGoal} 
            totalSold={primaryGoalSales}
            projectionValue={projectionValueForGoal}
            platformBreakdown={platformBreakdown}
            salesByDate={salesByDate}
            dollarRate={dollarRate?.rate}
            transactionCounts={transactionCounts}
          />
        )}

        {/* Restricted Financial Section - Show when user doesn't have access */}
        {!canViewFinancials && hasData && (
          <RestrictedFinancialSection title="Dados Financeiros" />
        )}

        {/* Currency and Transaction KPI Cards - right below goal cards */}
        {canViewFinancials && hasData && (() => {
          // Get platform-specific values
          // Use projectionStats for Hotmart real values (computed_value based)
          const hotmartRealBRL = projectionStats?.totalRealBRL || (hotmartStats?.totalByCurrency?.['BRL'] || 0);
          const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
          const hotmartProjectedBRL = projectionStats?.totalProjectedBRL || hotmartRealBRL;
          const tmbBRL = tmbStats?.totalBRL || 0;
          const eduzzBRL = eduzzStats?.totalBRL || 0;
          
          // Combined values (all platforms)
          const combinedRealBRL = hotmartRealBRL + tmbBRL + eduzzBRL;
          const combinedProjectedBRL = hotmartProjectedBRL + tmbBRL + eduzzBRL;
          const usdConvertedToBRL = dollarRate ? hotmartUSD * dollarRate.rate : 0;
          
          // For 'all' platform: show KPI cards (conditional based on active goal)
          // If there's an active goal, GoalSummarySection already shows "Faturamento Atual"
          // so we only show Projeção and Transações to avoid duplication
          if (platform === 'all') {
            const hasProjection = combinedProjectedBRL > combinedRealBRL;
            const hasActiveGoal = !!primaryGoal;
            
            // If no active goal, show colored styled cards
            if (!hasActiveGoal) {
              // Calcular valor pendente (a receber)
              const hotmartPendingBRL = hotmartProjectedBRL - hotmartRealBRL;
              
              return (
                <ColoredDashboardCards
                  totalBRL={combinedRealBRL + usdConvertedToBRL}
                  projectedBRL={combinedProjectedBRL + usdConvertedToBRL}
                  leadCount={leadCount || 0}
                  totalTransactions={stats?.totalTransactions || 0}
                  transactionCounts={transactionCounts}
                  hasProjection={hasProjection}
                  onLeadsClick={() => navigate('/leads')}
                  salesByDate={salesByDate}
                  dollarRate={dollarRate?.rate}
                  projectionBreakdown={{
                    hotmartRealBRL,
                    hotmartPendingBRL,
                    hotmartUSD,
                    hotmartUSDConverted: usdConvertedToBRL,
                    tmbBRL,
                    eduzzBRL,
                  }}
                />
              );
            }
            
            // If there's an active goal, don't show duplicate cards
            // (Faturamento and Projeção are already shown in GoalSummarySection)
            return null;
          }
          
          // For Hotmart platform: show Hotmart-specific values with dialog button
          if (platform === 'hotmart') {
            const hasProjection = hotmartProjectedBRL > hotmartRealBRL;
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <KPICard
                    title="Faturamento Real"
                    value={formatCurrency(hotmartRealBRL + usdConvertedToBRL, 'BRL')}
                    subtitle={hotmartUSD > 0 && dollarRate ? 
                      `Inclui ${formatCurrency(hotmartUSD, 'USD')}` : 
                      "Vendas recebidas"
                    }
                    icon={DollarSign}
                    delay={0}
                    className="border-l-4 border-l-green-500"
                  />
                  {hasProjection && (
                    <KPICard
                      title="Projeção de Faturamento"
                      value={formatCurrency(hotmartProjectedBRL + usdConvertedToBRL, 'BRL')}
                      subtitle="Inclui recorrências futuras"
                      icon={TrendingUp}
                      delay={1}
                      className="border-l-4 border-l-amber-500"
                    />
                  )}
                  <KPICard
                    title="Total Transações"
                    value={formatNumber(hotmartStats?.totalTransactions || 0)}
                    icon={ShoppingCart}
                    delay={hasProjection ? 2 : 1}
                  />
                  <KPICard
                    title="Total de Leads"
                    value={formatNumber(leadCount || 0)}
                    subtitle="no período"
                    icon={UserPlus}
                    delay={hasProjection ? 3 : 2}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate('/leads')}
                  />
                </div>
                
                {/* Vendas por Tipo button (Hotmart only) */}
                {salesBreakdown && salesBreakdown.length > 0 && (
                  <div className="flex items-center gap-2">
                    <SalesBreakdownDialog 
                      data={salesBreakdown}
                      isLoading={isLoadingBreakdown}
                    />
                    <span className="text-xs text-muted-foreground">
                      Ver detalhamento por tipo de cobrança
                    </span>
                  </div>
                )}
              </div>
            );
          }
          
          // For TMB or Eduzz: show platform-specific values
          const platformBRL = platform === 'tmb' ? tmbBRL : eduzzBRL;
          const platformTransactions = platform === 'tmb' 
            ? (tmbStats?.totalTransactions || 0) 
            : (eduzzStats?.totalTransactions || 0);
          
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <KPICard
                title="Faturamento"
                value={formatCurrency(platformBRL, 'BRL')}
                subtitle={platform === 'tmb' ? 'TMB' : 'Eduzz'}
                icon={DollarSign}
                delay={0}
                className="border-l-4 border-l-green-500"
              />
              <KPICard
                title="Total Transações"
                value={formatNumber(platformTransactions)}
                icon={ShoppingCart}
                delay={1}
              />
              <KPICard
                title="Total de Leads"
                value={formatNumber(leadCount || 0)}
                subtitle="no período"
                icon={UserPlus}
                delay={2}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate('/leads')}
              />
            </div>
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
            {canViewFinancials && !primaryGoal && (
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

            {/* Charts Row - 2/3 + 1/3 layout - Only for users with financial access */}
            {canViewFinancials && (
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
                  {(hotmartTotalBRL > 0 || tmbTotalBRL > 0 || eduzzTotalBRL > 0) && (
                    <PlatformSharePieChart 
                      hotmartTotal={hotmartTotalBRL} 
                      tmbTotal={tmbTotalBRL}
                      eduzzTotal={eduzzTotalBRL}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Sales Analytics Section - Consolidated - Only for users with financial access */}
            {canViewFinancials && (
              <DashboardSalesAnalytics
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                clientId={clientId}
                platform={platform}
              />
            )}

            {/* Top Customers - Only for users with financial access */}
            {canViewFinancials && <TopCustomers customers={topCustomers || []} />}
          </>
        )}
      </div>
    </MainLayout>
  );
}
