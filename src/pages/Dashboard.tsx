import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from 'react-day-picker';
import { 
  useTransactionStatsOptimized, 
  useTopCustomersOptimized, 
  useSalesByDateOptimized 
} from '@/hooks/useTransactionStatsOptimized';
import { useActiveGoals } from '@/hooks/useGoals';
import { MainLayout } from '@/components/layout/MainLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesByTimeChart } from '@/components/dashboard/SalesByTimeChart';
import { CountryDistribution } from '@/components/dashboard/CountryDistribution';
import { TopCustomers } from '@/components/dashboard/TopCustomers';
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Upload,
  Target,
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { subDays } from 'date-fns';
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

  // Use optimized database aggregations
  const { data: stats, isLoading: statsLoading } = useTransactionStatsOptimized({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: topCustomers, isLoading: customersLoading } = useTopCustomersOptimized({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: salesByDate, isLoading: salesLoading } = useSalesByDateOptimized({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { activeGoals } = useActiveGoals();

  const isLoading = statsLoading || customersLoading || salesLoading;

  const currencies = useMemo(() => {
    if (!stats?.totalByCurrency) return [];
    return Object.keys(stats.totalByCurrency);
  }, [stats]);

  // Taxa de conversão BRL -> USD (pode ser configurada depois)
  const BRL_TO_USD_RATE = 0.17; // ~5.88 BRL = 1 USD

  const consolidatedUSD = useMemo(() => {
    if (!stats?.totalByCurrency) return 0;
    const brlTotal = stats.totalByCurrency['BRL'] || 0;
    const usdTotal = stats.totalByCurrency['USD'] || 0;
    return usdTotal + (brlTotal * BRL_TO_USD_RATE);
  }, [stats]);

  const topCustomer = topCustomers?.[0];

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
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das suas vendas
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
            <Button variant="outline" onClick={() => navigate('/goals')}>
              <Target className="h-4 w-4 mr-2" />
              Metas
            </Button>
            <Button onClick={() => navigate('/upload')}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
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
            {/* KPI Cards - Sales by Currency (BRL and USD) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Cards by Currency */}
              {stats.totalByCurrency && Object.entries(stats.totalByCurrency)
                .sort(([, a], [, b]) => b - a)
                .map(([currency, total], index) => (
                  <KPICard
                    key={currency}
                    title={currency === 'BRL' ? 'Vendas em Reais' : 'Vendas em Dólares'}
                    value={formatCurrency(total, currency)}
                    icon={DollarSign}
                    delay={index}
                  />
                ))
              }

              {/* Consolidated Total in USD */}
              <KPICard
                title="Total Consolidado (USD)"
                value={formatCurrency(consolidatedUSD, 'USD')}
                subtitle="BRL convertido a 1 USD = R$ 5,88"
                icon={DollarSign}
                delay={Object.keys(stats.totalByCurrency || {}).length}
              />

              {/* Total Transactions */}
              <KPICard
                title="Total Transações"
                value={formatNumber(stats.totalTransactions)}
                icon={ShoppingCart}
                delay={Object.keys(stats.totalByCurrency || {}).length + 1}
              />

              {/* Top Customer */}
              {topCustomer && (
                <KPICard
                  title="Top Cliente"
                  value={topCustomer.name}
                  subtitle={`${formatCurrency(topCustomer.totalValue, topCustomer.currency)} • ${topCustomer.totalPurchases} compras`}
                  icon={Users}
                  delay={Object.keys(stats.totalByCurrency || {}).length + 2}
                />
              )}
            </div>

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeGoals.slice(0, 2).map((goal) => (
                  <GoalProgressCard
                    key={goal.id}
                    goal={goal}
                    totalSold={stats.totalByCurrency[goal.currency] || 0}
                  />
                ))}
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SalesByTimeChart 
                  data={salesByDate || {}} 
                  currencies={currencies}
                />
              </div>
              <div>
                <CountryDistribution data={stats.totalByCountry} />
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
