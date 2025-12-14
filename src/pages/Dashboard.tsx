import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTransactionStats } from '@/hooks/useTransactions';
import { useActiveGoals } from '@/hooks/useGoals';
import { MainLayout } from '@/components/layout/MainLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesByTimeChart } from '@/components/dashboard/SalesByTimeChart';
import { CountryDistribution } from '@/components/dashboard/CountryDistribution';
import { TopCustomers } from '@/components/dashboard/TopCustomers';
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard';
import { formatCurrency, formatNumber } from '@/lib/calculations/goalCalculations';
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  Upload,
  Target,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { subDays } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const [dateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { stats, isLoading } = useTransactionStats({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { activeGoals } = useActiveGoals();

  const currencies = useMemo(() => {
    if (!stats?.totalByCurrency) return [];
    return Object.keys(stats.totalByCurrency);
  }, [stats]);

  const topCustomer = stats?.topCustomers[0];

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
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das suas vendas
            </p>
          </div>
          <div className="flex gap-3">
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
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* BRL Card */}
              {stats.totalByCurrency.BRL !== undefined && (
                <KPICard
                  title="Total BRL"
                  value={formatCurrency(stats.totalByCurrency.BRL, 'BRL')}
                  icon={DollarSign}
                  delay={0}
                />
              )}

              {/* USD Card */}
              {stats.totalByCurrency.USD !== undefined && (
                <KPICard
                  title="Total USD"
                  value={formatCurrency(stats.totalByCurrency.USD, 'USD')}
                  icon={DollarSign}
                  delay={1}
                />
              )}

              {/* EUR Card */}
              {stats.totalByCurrency.EUR !== undefined && (
                <KPICard
                  title="Total EUR"
                  value={formatCurrency(stats.totalByCurrency.EUR, 'EUR')}
                  icon={DollarSign}
                  delay={2}
                />
              )}

              {/* Other currencies combined or Total Transactions */}
              <KPICard
                title="Total Transações"
                value={formatNumber(stats.totalTransactions)}
                icon={ShoppingCart}
                delay={3}
              />

              {/* Top Customer */}
              {topCustomer && (
                <KPICard
                  title="Top Cliente"
                  value={topCustomer.name}
                  subtitle={`${formatCurrency(topCustomer.totalValue, topCustomer.currency)} • ${topCustomer.totalPurchases} compras`}
                  icon={Users}
                  delay={4}
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
                  data={stats.salesByDate} 
                  currencies={currencies}
                />
              </div>
              <div>
                <CountryDistribution data={stats.totalByCountry} />
              </div>
            </div>

            {/* Top Customers */}
            <TopCustomers customers={stats.topCustomers} />
          </>
        )}
      </div>
    </MainLayout>
  );
}
