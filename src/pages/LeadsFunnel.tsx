import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useConversionSummaryRpc } from '@/hooks/useConversionSummaryRpc';
import { useFunnelEvolutionRpc } from '@/hooks/useFunnelEvolutionRpc';
import { ConversionFunnelCard } from '@/components/leads/ConversionFunnelCard';
import { FunnelEvolutionChart } from '@/components/leads/FunnelEvolutionChart';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { LeadsPeriodFilter } from '@/components/leads/LeadsPeriodFilter';
import { LandingPageComparisonCard } from '@/components/leads/LandingPageComparisonCard';
import { TopAdsByConversionCard } from '@/components/leads/TopAdsByConversionCard';
import { useLandingPageStatsRpc } from '@/hooks/useLandingPageStatsRpc';
import { useTopAdsByConversion } from '@/hooks/useTopAdsByConversion';
import { useFilter } from '@/contexts/FilterContext';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent } from '@/components/ui/card';
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
  const [conversionMode, setConversionMode] = useState<'ads' | 'campaigns'>('ads');

  const { clientId, isReady } = useFilter();
  const { data: clients } = useClients();

  const selectedClient = useMemo(() => {
    if (!clientId || !clients) return null;
    return clients.find(c => c.id === clientId);
  }, [clientId, clients]);

  const startDate = dateRange?.from ? startOfDay(dateRange.from) : undefined;
  const endDate = dateRange?.to ? endOfDay(dateRange.to) : undefined;

  // All data via RPCs - no client-side processing
  const { data: conversionData, isLoading: isLoadingConversion } = useConversionSummaryRpc({
    clientId: isReady ? clientId : undefined,
    startDate,
    endDate,
  });

  const { data: funnelEvolutionData = [], isLoading: isLoadingFunnel } = useFunnelEvolutionRpc({
    clientId,
    startDate,
    endDate,
    groupBy: funnelGroupBy,
  });

  const { data: landingPageData, isLoading: isLoadingPages } = useLandingPageStatsRpc({
    clientId,
    startDate,
    endDate,
    minLeads: showAllPages ? 0 : 5,
    limit: 20,
  });

  const { data: conversionAds, isLoading: isLoadingConversionAds } = useTopAdsByConversion({
    clientId,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
    mode: conversionMode,
  });

  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
  }, [dateRange]);

  const tc = conversionData || {
    totalLeads: 0, qualifiedLeads: 0, convertedLeads: 0,
    totalRevenue: 0, conversionRate: 0, qualificationRate: 0,
    qualifiedConversionRate: 0, averageTicket: 0, pageConversions: [],
  };

  if (!isReady) {
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
            value={tc.totalLeads.toString()}
            subtitle="leads únicos"
            icon={Users}
            variant="blue"
            delay={0}
          />
          <ColoredKPICard
            title="Leads Qualificados"
            value={tc.qualifiedLeads.toString()}
            subtitle={`${Number(tc.qualificationRate).toFixed(1)}% do total`}
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
            value={`${Number(tc.conversionRate).toFixed(2)}%`}
            subtitle="leads convertidos"
            icon={TrendingUp}
            variant="green"
            delay={2}
            tooltipContent={
              <div className="text-xs space-y-1">
                <p><strong>{tc.convertedLeads}</strong> de {tc.totalLeads} leads únicos</p>
                <p className="text-muted-foreground">Matching por email ou telefone</p>
              </div>
            }
          />
          <ColoredKPICard
            title="Conversão Qualificados"
            value={`${Number(tc.qualifiedConversionRate).toFixed(2)}%`}
            subtitle="entre qualificados"
            icon={Percent}
            variant="cyan"
            delay={3}
            tooltipContent={
              <div className="text-xs space-y-1">
                <p><strong>{tc.convertedLeads}</strong> convertidos de {tc.qualifiedLeads} qualificados</p>
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
            value={tc.convertedLeads.toString()}
            subtitle="com compra confirmada"
            icon={ShoppingCart}
            variant="cyan"
            delay={0}
          />
          <ColoredKPICard
            title="Receita Atribuída"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(tc.totalRevenue)}
            subtitle="vendas de leads"
            icon={DollarSign}
            variant="yellow"
            delay={1}
          />
          <ColoredKPICard
            title="Ticket Médio"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(tc.averageTicket)}
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
              totalLeads={tc.totalLeads}
              qualifiedLeads={tc.qualifiedLeads}
              convertedLeads={tc.convertedLeads}
              totalRevenue={tc.totalRevenue}
              topConvertingPages={tc.pageConversions?.map(p => ({
                normalizedUrl: p.normalizedUrl,
                displayName: p.displayName,
                totalLeads: p.totalLeads,
                uniqueEmails: p.totalLeads,
                convertedLeads: p.convertedLeads,
                conversionRate: p.conversionRate,
                totalRevenue: p.totalRevenue,
                averageTicket: p.averageTicket,
                currency: 'BRL',
              })) || []}
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
              isLoading={isLoadingFunnel}
              groupBy={funnelGroupBy}
              onGroupByChange={setFunnelGroupBy}
            />
          </motion.div>
        </div>

        {/* Top Ads by Conversion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TopAdsByConversionCard
            items={conversionAds || []}
            isLoading={isLoadingConversionAds}
            mode={conversionMode}
            onModeChange={setConversionMode}
          />
        </motion.div>

        {/* Landing Pages Conversion Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <LandingPageComparisonCard
            stats={landingPageData?.stats?.map(s => ({
              normalizedUrl: s.normalizedUrl,
              displayName: s.displayName,
              leadCount: s.leadCount,
              percentage: 0,
              firstLeadDate: s.firstLeadDate ? new Date(s.firstLeadDate) : null,
              lastLeadDate: s.lastLeadDate ? new Date(s.lastLeadDate) : null,
              dailyAverage: 0,
              activeDays: 0,
              isNew: false,
              trend: 'stable' as const,
              trendPercentage: 0,
              leadsByDay: {},
            })) || []}
            conversionStats={tc.pageConversions?.map(p => ({
              normalizedUrl: p.normalizedUrl,
              displayName: p.displayName,
              totalLeads: p.totalLeads,
              uniqueEmails: p.totalLeads,
              convertedLeads: p.convertedLeads,
              conversionRate: p.conversionRate,
              totalRevenue: p.totalRevenue,
              averageTicket: p.averageTicket,
              currency: 'BRL',
            })) || []}
            isLoading={isLoadingConversion || isLoadingPages}
            showAllPages={showAllPages}
            hiddenPagesCount={landingPageData?.hiddenPages || 0}
            onToggleShowAll={() => setShowAllPages(prev => !prev)}
          />
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default LeadsFunnel;
