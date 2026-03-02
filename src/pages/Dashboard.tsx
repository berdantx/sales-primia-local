import { useMemo, useState } from 'react';
import { calculateGoalProgress } from '@/lib/calculations/goalCalculations';
import { ProjectionCards } from '@/components/dashboard/ProjectionCards';
import { DateRange } from 'react-day-picker';
import { useCombinedStats, PlatformType } from '@/hooks/useCombinedStats';
import { DashboardControlBar } from '@/components/dashboard/DashboardControlBar';
import { useActiveGoals } from '@/hooks/useGoals';
import { useDollarRate } from '@/hooks/useDollarRate';
import { useLeadCount } from '@/hooks/useLeads';
import { useProjectionStats } from '@/hooks/useSalesBreakdown';
import { useCombinedTransactions } from '@/hooks/useCombinedTransactions';
import { useFilter } from '@/contexts/FilterContext';
import { useFinancialAccess } from '@/hooks/useFinancialAccess';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExecutiveKPICard } from '@/components/dashboard/ExecutiveKPICard';
import { RevenueEvolutionChart } from '@/components/dashboard/RevenueEvolutionChart';
import { PlatformSharePieChart } from '@/components/dashboard/PlatformSharePieChart';
import { TopProductsList } from '@/components/dashboard/TopProductsList';
import { StrategicRecommendationCard } from '@/components/dashboard/StrategicRecommendationCard';
import { CoproducerEarningsCard } from '@/components/dashboard/CoproducerEarningsCard';
import { RestrictedFinancialSection } from '@/components/dashboard/RestrictedFinancialSection';
import { StrategicScoreCard } from '@/components/dashboard/StrategicScoreCard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { Upload, Target, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getDateRangeBrasiliaUTC, startOfDayBrasiliaUTC, endOfDayBrasiliaUTC } from '@/lib/dateUtils';
import { CurrencyView } from '@/components/dashboard/CurrencyViewToggle';


type PeriodFilter = '1d' | '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [currencyView, setCurrencyView] = useState<CurrencyView>('combined');

  const { billingType, paymentMethod, sckCode, product, clientId, platform } = useFilter();

  const dateRange = useMemo(() => {
    if (period === 'all') return { startDate: undefined, endDate: undefined };
    if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: startOfDayBrasiliaUTC(customDateRange.from),
        endDate: endOfDayBrasiliaUTC(customDateRange.to),
      };
    }
    if (period === 'custom') return { startDate: undefined, endDate: undefined };
    const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    return getDateRangeBrasiliaUTC(days);
  }, [period, customDateRange]);

  const filters = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    billingType,
    paymentMethod,
    sckCode,
    product,
    clientId,
  }), [dateRange, billingType, paymentMethod, sckCode, product, clientId]);

  const { stats, salesByDate, isLoading, hotmartStats, tmbStats, eduzzStats } = useCombinedStats(filters, platform);
  const { canViewFinancials, isLoading: isLoadingAccess } = useFinancialAccess(clientId);
  const { data: dollarRate } = useDollarRate();
  const { data: leadCount } = useLeadCount({ startDate: dateRange.startDate, endDate: dateRange.endDate, clientId });
  const { data: projectionStats } = useProjectionStats({ startDate: dateRange.startDate, endDate: dateRange.endDate, clientId });
  const { transactions: combinedTransactions } = useCombinedTransactions({ startDate: dateRange.startDate, endDate: dateRange.endDate, clientId, platform });
  const { activeGoals } = useActiveGoals(clientId);

  const primaryGoal = activeGoals[0];

  // Compute revenue values
  const revenue = useMemo(() => {
    const hotmartRealBRL = projectionStats?.totalRealBRL || (hotmartStats?.totalByCurrency?.['BRL'] || 0);
    const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
    const hotmartProjectedBRL = projectionStats?.totalProjectedBRL || hotmartRealBRL;
    const tmbBRL = tmbStats?.totalBRL || 0;
    const eduzzBRL = eduzzStats?.totalBRL || 0;
    const eduzzUSD = eduzzStats?.totalUSD || 0;
    const totalUSD = hotmartUSD + eduzzUSD;
    const usdConverted = dollarRate ? totalUSD * dollarRate.rate : 0;

    const confirmed = hotmartRealBRL + tmbBRL + eduzzBRL + usdConverted;
    const projected = hotmartProjectedBRL + tmbBRL + eduzzBRL + usdConverted;

    return { confirmed, projected, hotmartBRL: hotmartRealBRL + (dollarRate ? hotmartUSD * dollarRate.rate : 0), tmbBRL, eduzzBRL: eduzzBRL + (dollarRate ? eduzzUSD * dollarRate.rate : 0), totalUSD };
  }, [projectionStats, hotmartStats, tmbStats, eduzzStats, dollarRate]);

  // Goal progress
  const goalProgressPercent = useMemo(() => {
    if (!primaryGoal) return 0;
    return Math.min((revenue.confirmed / primaryGoal.target_value) * 100, 100);
  }, [primaryGoal, revenue.confirmed]);

  const goalProgressData = useMemo(() => {
    if (!primaryGoal) return null;
    return calculateGoalProgress(primaryGoal, revenue.confirmed);
  }, [primaryGoal, revenue.confirmed]);

  const goalRemaining = primaryGoal ? Math.max(primaryGoal.target_value - revenue.confirmed, 0) : 0;

  // Top product name
  const topProductName = useMemo(() => {
    const groups: Record<string, number> = {};
    const rate = dollarRate?.rate || 5.5;
    combinedTransactions.forEach((t: any) => {
      const name = t.product || 'Sem produto';
      const val = t.currency === 'USD' ? t.value * rate : t.value;
      groups[name] = (groups[name] || 0) + val;
    });
    const sorted = Object.entries(groups).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || undefined;
  }, [combinedTransactions, dollarRate]);

  // Product totals for coproduction
  const productTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    combinedTransactions.forEach((t: any) => {
      const p = t.product;
      const v = t.computed_value || t.sale_value || t.ticket_value || 0;
      if (p) totals[p] = (totals[p] || 0) + v;
    });
    return totals;
  }, [combinedTransactions]);

  // Goal progress color
  const getProgressColor = (prog: number) => {
    if (primaryGoal) {
      // Check if behind expected rhythm
      const now = new Date();
      const start = new Date(primaryGoal.start_date);
      const end = new Date(primaryGoal.end_date);
      const totalDays = Math.max((end.getTime() - start.getTime()) / 86400000, 1);
      const elapsedDays = Math.max((now.getTime() - start.getTime()) / 86400000, 0);
      const expectedProgress = (elapsedDays / totalDays) * 100;
      if (prog < expectedProgress * 0.7) return 'bg-amber-300';
    }
    if (prog >= 80) return 'bg-emerald-300';
    if (prog >= 40) return 'bg-blue-300';
    return 'bg-muted-foreground/30';
  };

  const getGoalRhythmHint = (prog: number) => {
    if (!goalProgressData) return undefined;
    const { daysElapsed, totalDays } = goalProgressData;
    const timePercent = totalDays > 0 ? Math.min(Math.round((daysElapsed / totalDays) * 100), 100) : 0;
    const goalPercent = Math.round(prog);
    const hint = `${goalPercent}% da meta · ${timePercent}% do período decorrido`;
    const rhythm = prog < timePercent ? 'Ritmo abaixo do necessário' : 'Ritmo alinhado com meta';
    return `${hint}\n${rhythm}`;
  };

  const isRevenueFullyRealized = Math.abs(revenue.confirmed - revenue.projected) < 1;

  // Compute rhythm status for control bar
  const rhythmStatus = useMemo(() => {
    if (!goalProgressData || !primaryGoal) return null;
    const { daysElapsed, totalDays, daysRemaining, remaining, totalSold } = goalProgressData;
    const safeDays = Math.max(1, Math.min(daysElapsed, totalDays || daysElapsed));
    const ritmoAtual = totalSold / safeDays;
    const ritmoNecessario = daysRemaining > 0 ? remaining / daysRemaining : 0;
    const rhythmPercent = ritmoNecessario > 0 ? (ritmoAtual / ritmoNecessario) * 100 : (totalSold >= primaryGoal.target_value ? 100 : 0);
    const periodPercent = totalDays > 0 ? Math.min(Math.round((daysElapsed / totalDays) * 100), 100) : 0;
    return { rhythmPercent, periodPercent, isOnTrack: rhythmPercent >= 100 };
  }, [goalProgressData, primaryGoal]);

  // Compute strategic score for control bar
  const strategicScore = useMemo(() => {
    if (!rhythmStatus) return null;
    const rhythmScore = Math.min(rhythmStatus.rhythmPercent, 100);
    const goalScore = primaryGoal ? goalProgressPercent : 50;
    const convRate = stats && leadCount && leadCount > 0 ? (stats.totalTransactions / leadCount) * 100 : 0;
    const conversionScore = Math.min(convRate * 10, 100);
    const timingScore = (() => {
      if (!primaryGoal || rhythmStatus.periodPercent === 0) return 50;
      const ratio = goalProgressPercent / Math.max(rhythmStatus.periodPercent, 1);
      return Math.min(ratio * 100, 100);
    })();
    return Math.round(rhythmScore * 0.35 + goalScore * 0.30 + conversionScore * 0.20 + timingScore * 0.15);
  }, [rhythmStatus, primaryGoal, goalProgressPercent, stats, leadCount]);

  if (isLoading || isLoadingAccess) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-[1400px] mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            <Skeleton className="lg:col-span-2 h-[320px] rounded-2xl" />
            <Skeleton className="h-[320px] rounded-2xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasData = stats && stats.totalTransactions > 0;

  return (
    <MainLayout>
        <div className="space-y-8 max-w-[1400px] mx-auto">
        {/* Control Bar */}
        <DashboardControlBar
          period={period}
          onPeriodChange={setPeriod}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          currencyView={currencyView}
          onCurrencyViewChange={setCurrencyView}
          canViewFinancials={canViewFinancials}
          rhythmStatus={rhythmStatus}
          strategicScore={strategicScore}
        />

        {/* Restricted notice */}
        {!canViewFinancials && hasData && (
          <RestrictedFinancialSection title="Dados Financeiros" />
        )}

        {!hasData ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <Upload className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma transação ainda</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Importe sua primeira planilha de vendas para começar a visualizar seus KPIs e acompanhar suas metas.
            </p>
            <Button size="lg" onClick={() => navigate('/upload')}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Planilha
            </Button>
          </div>
        ) : (
          <>
            {/* 4 Executive KPI Cards */}
            {canViewFinancials && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                <ExecutiveKPICard
                  microLabel="CAIXA CONSOLIDADO"
                  label="Receita Confirmada"
                  value={formatCurrency(revenue.confirmed, 'BRL')}
                  badge={isRevenueFullyRealized ? "100% realizado" : "Caixa"}
                  badgeClassName={isRevenueFullyRealized ? "bg-emerald-50 text-emerald-700 border-emerald-200" : undefined}
                  subtitle={isRevenueFullyRealized ? "Vendas pagas e efetivadas" : "Vendas pagas e efetivadas"}
                  icon={DollarSign}
                  accentColor="border-t-emerald-400/60"
                  iconClassName="bg-emerald-100 text-emerald-600"
                />
                <ExecutiveKPICard
                  microLabel="PROJEÇÃO"
                  label="Receita Projetada"
                  value={formatCurrency(revenue.projected, 'BRL')}
                  badge={isRevenueFullyRealized ? "Consolidado" : "Previsão"}
                  badgeClassName={isRevenueFullyRealized ? "bg-muted text-foreground/70 border-border" : "bg-blue-50 text-blue-700 border-blue-200"}
                  subtitle={isRevenueFullyRealized ? "Sem valores pendentes" : "Inclui parcelas futuras"}
                  subtitleClassName="text-foreground/60"
                  valueClassName="text-foreground/70 text-xl font-semibold"
                  icon={TrendingUp}
                  accentColor="border-t-blue-400/60"
                  iconClassName="bg-blue-100 text-blue-600"
                  tooltipContent={
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Já processado:</span>
                        <span className="font-medium">{formatCurrency(revenue.confirmed, 'BRL')}</span>
                      </div>
                      {revenue.projected - revenue.confirmed > 0 && (
                        <div className="flex justify-between gap-4">
                          <span className="text-yellow-500">A receber (recorrências):</span>
                          <span className="font-medium text-yellow-500">{formatCurrency(revenue.projected - revenue.confirmed, 'BRL')}</span>
                        </div>
                      )}
                      {dollarRate && revenue.totalUSD > 0 && (
                        <div className="flex justify-between gap-4">
                          <span className="text-blue-400">USD convertido:</span>
                          <span className="font-medium text-blue-400">{formatCurrency(revenue.totalUSD * dollarRate.rate, 'BRL')}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                        Soma dos valores já processados + parcelas futuras de transações parceladas.
                      </p>
                    </div>
                  }
                />
                <ExecutiveKPICard
                  label="Meta do Período"
                  value={primaryGoal ? formatCurrency(primaryGoal.target_value, primaryGoal.currency) : '—'}
                  subtitle={primaryGoal ? `Faltam ${formatCurrency(goalRemaining, primaryGoal.currency)}` : 'Nenhuma meta ativa'}
                  subtitleClassName={primaryGoal ? "font-medium" : undefined}
                  progress={primaryGoal ? goalProgressPercent : undefined}
                  progressColor={primaryGoal ? getProgressColor(goalProgressPercent) : undefined}
                  progressHint={primaryGoal ? getGoalRhythmHint(goalProgressPercent) : undefined}
                  onClick={!primaryGoal ? () => navigate('/goals') : undefined}
                  icon={Target}
                  accentColor="border-t-amber-500/70"
                  iconClassName="bg-amber-100 text-amber-700"
                />
                <ExecutiveKPICard
                  microLabel="AQUISIÇÃO"
                  label="Leads no Período"
                  value={formatNumber(leadCount || 0)}
                  subtitle={(() => {
                    const lines: string[] = [];
                    if (stats && stats.totalTransactions > 0 && leadCount && leadCount > 0) {
                      lines.push(`Conversão: ${((stats.totalTransactions / leadCount) * 100).toFixed(1)}%`);
                    }
                    lines.push("Com UTMs e origem");
                    return lines.join(' · ');
                  })()}
                  onClick={() => navigate('/leads')}
                  icon={Users}
                  accentColor="border-t-violet-400/60"
                  iconClassName="bg-violet-100 text-violet-600"
                />
              </div>
            )}

            {/* CTA to create goal */}
            {canViewFinancials && !primaryGoal && (
              <div className="p-4 bg-primary/[0.04] border border-primary/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Crie uma meta de faturamento</p>
                    <p className="text-xs text-muted-foreground">
                      Acompanhe progresso com projeções automáticas
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/goals')}>
                  <Target className="h-4 w-4 mr-2" />
                  Criar Meta
                </Button>
              </div>
            )}

            {/* Ritmo + Score lado a lado */}
            {canViewFinancials && goalProgressData && primaryGoal && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
                <div className="lg:col-span-2">
                  <ProjectionCards progress={goalProgressData} currency={primaryGoal.currency} />
                </div>
                <div className="lg:col-span-1">
                  <StrategicScoreCard
                    rhythmPercent={rhythmStatus?.rhythmPercent || 0}
                    goalProgress={goalProgressPercent}
                    periodPercent={rhythmStatus?.periodPercent || 0}
                    conversionRate={stats && leadCount && leadCount > 0 ? (stats.totalTransactions / leadCount) * 100 : 0}
                    hasGoal={!!primaryGoal}
                  />
                </div>
              </div>
            )}

            {/* Charts: Evolution (2/3) + Recommendation (1/3) */}
            {canViewFinancials && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                <div className="lg:col-span-2">
                  <RevenueEvolutionChart
                    salesByDate={salesByDate || {}}
                    dollarRate={dollarRate?.rate}
                  />
                </div>
                <div className="lg:col-span-1">
                  <StrategicRecommendationCard
                    hasGoal={!!primaryGoal}
                    goalProgress={goalProgressPercent}
                    topProduct={topProductName}
                    leadCount={leadCount || 0}
                    totalRevenue={revenue.confirmed}
                  />
                </div>
              </div>
            )}

            {/* Platform Pie Chart + Top Products */}
            {canViewFinancials && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                <div className="lg:col-span-2">
                  <TopProductsList
                    transactions={combinedTransactions}
                    dollarRate={dollarRate?.rate}
                    limit={5}
                  />
                </div>
                <div className="lg:col-span-1">
                  {(revenue.hotmartBRL > 0 || revenue.tmbBRL > 0 || revenue.eduzzBRL > 0) && (
                    <PlatformSharePieChart
                      hotmartTotal={revenue.hotmartBRL}
                      tmbTotal={revenue.tmbBRL}
                      eduzzTotal={revenue.eduzzBRL}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Coproduction Card */}
            {combinedTransactions.length > 0 && (
              <CoproducerEarningsCard
                clientId={clientId}
                productTotals={productTotals}
              />
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
