import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useLeads } from '@/hooks/useLeads';
import { useLandingPageConversion } from '@/hooks/useLandingPageConversion';
import { useFunnelEvolution } from '@/hooks/useFunnelEvolution';
import { ConversionFunnelCard } from '@/components/leads/ConversionFunnelCard';
import { FunnelEvolutionChart } from '@/components/leads/FunnelEvolutionChart';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { LeadsPeriodFilter } from '@/components/leads/LeadsPeriodFilter';
import { LandingPageComparisonCard } from '@/components/leads/LandingPageComparisonCard';
import { useLandingPageStats } from '@/hooks/useLandingPageStats';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Loader2,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Target,
  Users,
  Percent,
} from 'lucide-react';

function LeadsFunnel() {
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [funnelGroupBy, setFunnelGroupBy] = useState<'day' | 'week'>('day');
  const [showAllPages, setShowAllPages] = useState(false);

  const { clientId, isReady } = useFilter();
  const { data: clients } = useClients();

  const selectedClient = useMemo(() => {
    if (!clientId || !clients) return null;
    return clients.find(c => c.id === clientId);
  }, [clientId, clients]);

  const filters = useMemo(() => {
    return {
      startDate: dateRange?.from ? startOfDay(dateRange.from) : undefined,
      endDate: dateRange?.to ? endOfDay(dateRange.to) : undefined,
      clientId,
    };
  }, [clientId, dateRange]);

  const { data: leads, isLoading } = useLeads(isReady ? filters : undefined);

  // Landing page stats
  const { stats: landingPageStats, totalPagesCount, pageOptions, hiddenPagesCount } = useLandingPageStats({
    leads,
    limit: 20,
    minLeads: 5,
    showAll: showAllPages,
  });

  // Conversion tracking
  const { conversionStats, totalConversion, isLoading: isLoadingConversion } = useLandingPageConversion({
    clientId,
    leads: leads || [],
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });

  // Funnel evolution
  const convertedEmails = useMemo(() => new Set<string>(), []);
  const funnelEvolutionData = useFunnelEvolution({
    leads: leads || [],
    convertedEmails,
    groupBy: funnelGroupBy,
  });

  // Date range label for PDF export
  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
  }, [dateRange]);

  if (!isReady || isLoading) {
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
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/leads">Leads</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Funil de Conversão</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <ClientContextHeader
            title="Funil de Conversão"
            description="Análise de conversão de leads em vendas"
          />
        </motion.div>

        {/* Period Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-3 sm:p-4">
              <LeadsPeriodFilter
                selectedPeriod={selectedPeriod}
                dateRange={dateRange}
                onPeriodChange={setSelectedPeriod}
                onDateRangeChange={setDateRange}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversion KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4"
        >
          <ColoredKPICard
            title="Total de Leads"
            value={totalConversion.totalLeads.toString()}
            subtitle="leads únicos"
            icon={Users}
            variant="blue"
            delay={0}
          />
          <ColoredKPICard
            title="Leads Qualificados"
            value={totalConversion.qualifiedLeads.toString()}
            subtitle={`${totalConversion.qualificationRate.toFixed(1)}% do total`}
            icon={Target}
            variant="purple"
            delay={1}
            tooltipContent={
              <div className="text-xs space-y-1">
                <p>Leads com UTMs completos:</p>
                <p className="text-muted-foreground">utm_source + utm_medium + utm_campaign</p>
              </div>
            }
          />
          <ColoredKPICard
            title="Taxa de Conversão"
            value={`${totalConversion.conversionRate.toFixed(2)}%`}
            subtitle="leads convertidos"
            icon={TrendingUp}
            variant="green"
            delay={2}
            tooltipContent={
              <div className="text-xs space-y-1">
                <p><strong>{totalConversion.totalConverted}</strong> de {totalConversion.totalLeads} leads únicos</p>
                <p className="text-muted-foreground">Matching por email ou telefone</p>
              </div>
            }
          />
          <ColoredKPICard
            title="Conversão Qualificados"
            value={`${totalConversion.qualifiedConversionRate.toFixed(2)}%`}
            subtitle="entre qualificados"
            icon={Percent}
            variant="cyan"
            delay={3}
            tooltipContent={
              <div className="text-xs space-y-1">
                <p><strong>{totalConversion.totalConverted}</strong> convertidos de {totalConversion.qualifiedLeads} qualificados</p>
              </div>
            }
          />
        </motion.div>

        {/* Revenue KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4"
        >
          <ColoredKPICard
            title="Leads Convertidos"
            value={totalConversion.totalConverted.toString()}
            subtitle="com compra confirmada"
            icon={ShoppingCart}
            variant="cyan"
            delay={0}
          />
          <ColoredKPICard
            title="Receita Atribuída"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalConversion.totalRevenue)}
            subtitle="vendas de leads"
            icon={DollarSign}
            variant="yellow"
            delay={1}
          />
          <ColoredKPICard
            title="Ticket Médio"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalConversion.averageTicket)}
            subtitle="por lead convertido"
            icon={BarChart3}
            variant="orange"
            delay={2}
            className="col-span-2 lg:col-span-1"
          />
        </motion.div>

        {/* Funnel + Evolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ConversionFunnelCard
              totalLeads={totalConversion.totalLeads}
              qualifiedLeads={totalConversion.qualifiedLeads}
              convertedLeads={totalConversion.totalConverted}
              totalRevenue={totalConversion.totalRevenue}
              topConvertingPages={conversionStats}
              isLoading={isLoadingConversion}
              clientName={selectedClient?.name}
              dateRange={dateRangeLabel}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <FunnelEvolutionChart
              data={funnelEvolutionData}
              isLoading={isLoadingConversion}
              groupBy={funnelGroupBy}
              onGroupByChange={setFunnelGroupBy}
            />
          </motion.div>
        </div>

        {/* Landing Pages Conversion Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <LandingPageComparisonCard
            stats={landingPageStats}
            conversionStats={conversionStats}
            isLoading={isLoadingConversion}
            showAllPages={showAllPages}
            hiddenPagesCount={hiddenPagesCount}
            onToggleShowAll={() => setShowAllPages(prev => !prev)}
          />
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default LeadsFunnel;
