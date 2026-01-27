import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useLeadsPaginated } from '@/hooks/useLeadsPaginated';
import { useLeadStatsOptimized } from '@/hooks/useLeadStatsOptimized';
import { useTopAdsOptimized } from '@/hooks/useTopAdsOptimized';
import { useLandingPageStats } from '@/hooks/useLandingPageStats';
import { useLandingPageConversion } from '@/hooks/useLandingPageConversion';
import { TopAdsCard } from '@/components/leads/TopAdsCard';
import { AdTrendChart } from '@/components/leads/AdTrendChart';
import { LeadsByCountryChart } from '@/components/leads/LeadsByCountryChart';
import { LeadsWorldMap } from '@/components/leads/LeadsWorldMap';
import { LandingPageComparisonCard } from '@/components/leads/LandingPageComparisonCard';
import { LandingPageTrendChart } from '@/components/leads/LandingPageTrendChart';
import { useFilter } from '@/contexts/FilterContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadsFilters } from '@/components/leads/LeadsFilters';
import { LeadsByDayChart } from '@/components/leads/LeadsByDayChart';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { formatDateTimeBR } from '@/lib/dateUtils';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { normalizePageUrl } from '@/lib/urlUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  X,
  Users,
  TrendingUp,
  Globe,
  FlaskConical,
  Trash2,
  BarChart3,
  MapPin,
  Target,
  ArrowRight,
  Megaphone
} from 'lucide-react';

const ITEMS_PER_PAGE = 50;

type ViewMode = 'ads' | 'campaigns' | 'pages';
type GroupBy = 'day' | 'week';

function Leads() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>('all');
  const [utmMediumFilter, setUtmMediumFilter] = useState<string>('all');
  const [utmCampaignFilter, setUtmCampaignFilter] = useState<string>('all');
  const [utmContentFilter, setUtmContentFilter] = useState<string>('all');
  const [utmTermFilter, setUtmTermFilter] = useState<string>('all');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [trafficTypeFilter, setTrafficTypeFilter] = useState<string>('all');
  const [showAllPages, setShowAllPages] = useState(false);
  const [testFilter, setTestFilter] = useState<string>('hide');
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [topMode, setTopMode] = useState<ViewMode>('ads');
  const [trendGroupBy, setTrendGroupBy] = useState<GroupBy>('day');
  const [chartTab, setChartTab] = useState<'daily' | 'evolution'>('daily');
  const [selectedTopItem, setSelectedTopItem] = useState<string | null>(null);
  const [qualifiedFilter, setQualifiedFilter] = useState<string>('all');
  const [showCharts, setShowCharts] = useState(false);
  const [hideUnidentifiedGeo, setHideUnidentifiedGeo] = useState(false);
  
  const { clientId, isReady } = useFilter();
  const queryClient = useQueryClient();

  // Lazy load charts after initial render
  useEffect(() => {
    const timer = setTimeout(() => setShowCharts(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Date filters for stats
  const statsFilters = useMemo(() => ({
    startDate: dateRange?.from ? startOfDay(dateRange.from) : undefined,
    endDate: dateRange?.to ? endOfDay(dateRange.to) : undefined,
    clientId,
  }), [clientId, dateRange]);

  // Paginated filters for table
  const paginatedFilters = useMemo(() => ({
    startDate: dateRange?.from ? startOfDay(dateRange.from) : undefined,
    endDate: dateRange?.to ? endOfDay(dateRange.to) : undefined,
    clientId,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    utmSource: utmSourceFilter !== 'all' ? utmSourceFilter : undefined,
    utmMedium: utmMediumFilter !== 'all' ? utmMediumFilter : undefined,
    utmCampaign: utmCampaignFilter !== 'all' ? utmCampaignFilter : undefined,
    utmContent: utmContentFilter !== 'all' ? utmContentFilter : undefined,
    utmTerm: utmTermFilter !== 'all' ? utmTermFilter : undefined,
    country: countryFilter !== 'all' ? countryFilter : undefined,
    pageUrl: pageFilter !== 'all' ? pageFilter : undefined,
    search: search || undefined,
    showTestLeads: testFilter !== 'hide',
    showQualified: qualifiedFilter,
    trafficType: trafficTypeFilter !== 'all' ? trafficTypeFilter : undefined,
  }), [clientId, dateRange, sourceFilter, utmSourceFilter, utmMediumFilter, utmCampaignFilter, utmContentFilter, utmTermFilter, countryFilter, pageFilter, search, testFilter, qualifiedFilter, trafficTypeFilter]);

  // Optimized stats from SQL function (single query)
  const { data: stats, isLoading: isLoadingStats } = useLeadStatsOptimized(isReady ? statsFilters : undefined);

  // Optimized top ads from SQL function
  const { data: topAdsData, isLoading: isLoadingTopAds } = useTopAdsOptimized(isReady ? {
    ...statsFilters,
    mode: topMode,
    limit: 10,
  } : undefined);

  // Paginated leads for table (only fetches what's needed)
  const { data: paginatedData, isLoading: isLoadingLeads } = useLeadsPaginated({
    filters: isReady ? paginatedFilters : undefined,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  });

  // Landing page stats (still needs leads for now - could be optimized later)
  const { stats: landingPageStats, totalPagesCount, hiddenPagesCount } = useLandingPageStats({ 
    leads: paginatedData?.leads || [], 
    limit: 10,
    minLeads: 5,
    showAll: showAllPages 
  });

  const topItemNames = useMemo(() => 
    topAdsData?.items?.map(item => item.name) || [], 
    [topAdsData]
  );
  
  // Conversion tracking - only load when charts are visible
  const { conversionStats, totalConversion, isLoading: isLoadingConversion } = useLandingPageConversion({
    clientId,
    leads: paginatedData?.leads || [],
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });

  // Filter options from stats (already aggregated)
  const filterOptions = useMemo(() => {
    // Filter out unidentified countries from the filter options if hideUnidentifiedGeo is true
    const countries = Object.keys(stats?.byCountry || {})
      .filter(c => {
        if (hideUnidentifiedGeo && (c === 'Não identificado' || c === 'Desconhecido')) return false;
        return true;
      })
      .sort((a, b) => 
        (stats?.byCountry[b] || 0) - (stats?.byCountry[a] || 0)
      );
    
    return {
      sources: Object.keys(stats?.bySource || {}).sort(),
      countries,
      utmSources: Object.keys(stats?.byUtmSource || {}).sort(),
      utmMediums: Object.keys(stats?.byUtmMedium || {}).sort(),
      utmCampaigns: Object.keys(stats?.byUtmCampaign || {}).sort(),
      utmContents: Object.keys(stats?.byUtmContent || {}).sort(),
      utmTerms: Object.keys(stats?.byUtmTerm || {}).sort(),
      pages: Object.keys(stats?.byPage || {}).sort(),
      trafficTypes: Object.keys(stats?.byTrafficType || {}).filter(t => t !== 'unknown').sort(),
      sourceCounts: stats?.bySource || {},
      countryCounts: stats?.byCountry || {},
      utmSourceCounts: stats?.byUtmSource || {},
      utmMediumCounts: stats?.byUtmMedium || {},
      utmCampaignCounts: stats?.byUtmCampaign || {},
      utmContentCounts: stats?.byUtmContent || {},
      utmTermCounts: stats?.byUtmTerm || {},
      pageCounts: stats?.byPage || {},
      trafficTypeCounts: stats?.byTrafficType || {},
    };
  }, [stats, hideUnidentifiedGeo]);

  // Check if lead is a test lead
  const isTestLead = (tags: string | null) => {
    if (!tags) return false;
    return tags.includes('[TESTE]') || tags.toLowerCase().includes('teste');
  };

  // Count test leads from current page
  const testLeadsCount = useMemo(() => {
    if (!paginatedData?.leads) return 0;
    return paginatedData.leads.filter(l => isTestLead(l.tags)).length;
  }, [paginatedData?.leads]);

  const totalPages = paginatedData?.totalPages || 1;
  const totalCount = paginatedData?.totalCount || 0;

  const handleExportCSV = async (excludeTests: boolean = false) => {
    // For export, we need to fetch all leads matching filters
    toast.info('Preparando exportação...');
    
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (paginatedFilters.clientId) {
        query = query.eq('client_id', paginatedFilters.clientId);
      }
      if (paginatedFilters.startDate) {
        query = query.gte('created_at', paginatedFilters.startDate.toISOString());
      }
      if (paginatedFilters.endDate) {
        query = query.lte('created_at', paginatedFilters.endDate.toISOString());
      }

      const { data: leadsToExport, error } = await query;
      if (error) throw error;

      let filteredExport = leadsToExport || [];
      if (excludeTests) {
        filteredExport = filteredExport.filter(l => !isTestLead(l.tags));
      }

      const headers = ['Data', 'Nome', 'Email', 'Telefone', 'Fonte', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Tags', 'Página'];
      const rows = filteredExport.map(l => [
        l.created_at ? formatDateTimeBR(l.created_at, 'dd/MM/yyyy HH:mm') : '',
        `${l.first_name || ''} ${l.last_name || ''}`.trim(),
        l.email || '',
        l.phone || '',
        l.source || '',
        l.utm_source || '',
        l.utm_medium || '',
        l.utm_campaign || '',
        l.tags || '',
        l.page_url || '',
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = excludeTests ? '-sem-testes' : '';
      a.download = `leads${suffix}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      
      toast.success(`${filteredExport.length} leads exportados!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar leads');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('all');
    setCountryFilter('all');
    setUtmSourceFilter('all');
    setUtmMediumFilter('all');
    setUtmCampaignFilter('all');
    setUtmContentFilter('all');
    setUtmTermFilter('all');
    setPageFilter('all');
    setTrafficTypeFilter('all');
    setTestFilter('hide');
    setQualifiedFilter('all');
    setSelectedPeriod('30days');
    setDateRange({ from: subDays(new Date(), 30), to: new Date() });
    setCurrentPage(0);
    setSelectedTopItem(null);
  };

  const hasActiveFilters = Boolean(
    search || 
    sourceFilter !== 'all' || 
    countryFilter !== 'all' || 
    utmSourceFilter !== 'all' || 
    utmMediumFilter !== 'all' || 
    utmCampaignFilter !== 'all' || 
    utmContentFilter !== 'all' || 
    utmTermFilter !== 'all' || 
    pageFilter !== 'all' || 
    trafficTypeFilter !== 'all' ||
    testFilter !== 'hide' || 
    qualifiedFilter !== 'all' || 
    selectedPeriod !== '30days' || 
    selectedTopItem
  );

  // Backfill geolocation handler
  const handleBackfillGeolocation = async () => {
    setIsBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-geolocation', {
        body: { batchSize: 100, maxBatches: 10 }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Geolocalização atualizada: ${data.stats.totalUpdated} leads processados`);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead-stats-optimized'] });
      } else {
        toast.error(data?.error || 'Erro ao processar geolocalização');
      }
    } catch (error) {
      console.error('Backfill error:', error);
      toast.error('Erro ao processar geolocalização retroativa');
    } finally {
      setIsBackfilling(false);
    }
  };

  // Handle mode change - reset selected item when mode changes
  const handleTopModeChange = (mode: ViewMode) => {
    setTopMode(mode);
    setSelectedTopItem(null);
  };

  const handleDeleteTestLeads = async () => {
    setIsDeleting(true);
    try {
      // Get test lead IDs from current filters
      let query = supabase
        .from('leads')
        .select('id, tags');

      if (paginatedFilters.clientId) {
        query = query.eq('client_id', paginatedFilters.clientId);
      }
      if (paginatedFilters.startDate) {
        query = query.gte('created_at', paginatedFilters.startDate.toISOString());
      }
      if (paginatedFilters.endDate) {
        query = query.lte('created_at', paginatedFilters.endDate.toISOString());
      }

      const { data: allLeads, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const testLeadIds = (allLeads || [])
        .filter(l => isTestLead(l.tags))
        .map(l => l.id);

      if (testLeadIds.length === 0) {
        toast.info('Não há leads de teste para deletar.');
        return;
      }

      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', testLeadIds);

      if (error) throw error;

      toast.success(`${testLeadIds.length} leads de teste deletados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats-optimized'] });
    } catch (error) {
      console.error('Error deleting test leads:', error);
      toast.error('Erro ao deletar leads de teste.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Transform topAdsData to match TopAdsCard expected format
  const topItems = useMemo(() => {
    if (!topAdsData?.items) return [];
    return topAdsData.items.map(item => ({
      name: item.name,
      lead_count: item.count,
      percentage: item.percentage,
      isNew: item.isNew,
      firstLeadDate: item.firstLeadDate ? new Date(item.firstLeadDate) : null,
      related: [],
    }));
  }, [topAdsData]);

  const isLoading = !isReady || isLoadingStats;

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
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <ClientContextHeader 
            title="Leads"
            description={`${totalCount.toLocaleString('pt-BR')} leads encontrados`}
          />
          <div className="flex gap-2 w-full sm:w-auto">
            {testLeadsCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Deletar Testes</span>
                    <span className="sm:hidden">Testes</span>
                    <span className="ml-1">({testLeadsCount})</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deletar leads de teste?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá deletar permanentemente leads de teste 
                      (com tag [TESTE] ou "teste"). Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteTestLeads}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deletando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar leads de teste
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackfillGeolocation}
              disabled={isBackfilling}
              className="flex-1 sm:flex-none"
            >
              {isBackfilling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Atualizar Geo</span>
                  <span className="sm:hidden">Geo</span>
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportCSV(false)}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV(true)}>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Apenas reais (sem testes)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Summary KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4"
        >
          <ColoredKPICard
            title="Tipo de Tráfego"
            value=""
            icon={Megaphone}
            variant="blue"
            delay={0}
            customContent={
              (() => {
                const byType = stats?.byTrafficType || {};
                const total = stats?.total || 0;
                const paid = byType['paid'] || 0;
                const organic = byType['organic'] || 0;
                const direct = byType['direct'] || 0;
                const paidPercent = total > 0 ? ((paid / total) * 100).toFixed(1) : '0';
                const organicPercent = total > 0 ? ((organic / total) * 100).toFixed(1) : '0';
                const directPercent = total > 0 ? ((direct / total) * 100).toFixed(1) : '0';
                
                return (
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Pago
                      </span>
                      <span className="font-medium">
                        {paid.toLocaleString('pt-BR')}
                        <span className="text-xs text-white/70 ml-1">({paidPercent}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Orgânico
                      </span>
                      <span className="font-medium">
                        {organic.toLocaleString('pt-BR')}
                        <span className="text-xs text-white/70 ml-1">({organicPercent}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        Direto
                      </span>
                      <span className="font-medium">
                        {direct.toLocaleString('pt-BR')}
                        <span className="text-xs text-white/70 ml-1">({directPercent}%)</span>
                      </span>
                    </div>
                  </div>
                );
              })()
            }
          />
          <ColoredKPICard
            title="Total de Leads"
            value={stats?.total?.toLocaleString('pt-BR') || '0'}
            subtitle="no período"
            icon={Users}
            variant="purple"
            delay={1}
          />
          <ColoredKPICard
            title="Fontes Diferentes"
            value={Object.keys(stats?.bySource || {}).length.toString()}
            subtitle="origens de leads"
            icon={Globe}
            variant="cyan"
            delay={2}
          />
          <ColoredKPICard
            title="Média Diária"
            value={stats?.byDay ? (stats.total / Math.max(Object.keys(stats.byDay).length, 1)).toFixed(1) : '0'}
            subtitle="leads por dia"
            icon={TrendingUp}
            variant="green"
            delay={3}
          />
        </motion.div>

        {/* Conversion Summary Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Funil de Conversão</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {totalConversion.totalConverted} conversões • {totalConversion.conversionRate.toFixed(1)}% taxa • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(totalConversion.totalRevenue)} receita
                    </p>
                  </div>
                </div>
                <Button asChild variant="default" size="sm" className="gap-2">
                  <Link to="/leads/funnel">
                    Ver Funil Completo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <LeadsFilters
              selectedPeriod={selectedPeriod}
              dateRange={dateRange}
              onPeriodChange={(period) => {
                setSelectedPeriod(period);
                setCurrentPage(0);
              }}
              onDateRangeChange={(range) => {
                setDateRange(range);
                setCurrentPage(0);
              }}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setCurrentPage(0);
              }}
              sourceFilter={sourceFilter}
              onSourceFilterChange={(v) => { setSourceFilter(v); setCurrentPage(0); }}
              countryFilter={countryFilter}
              onCountryFilterChange={(v) => { setCountryFilter(v); setCurrentPage(0); }}
              utmSourceFilter={utmSourceFilter}
              onUtmSourceFilterChange={(v) => { setUtmSourceFilter(v); setCurrentPage(0); }}
              utmMediumFilter={utmMediumFilter}
              onUtmMediumFilterChange={(v) => { setUtmMediumFilter(v); setCurrentPage(0); }}
              utmCampaignFilter={utmCampaignFilter}
              onUtmCampaignFilterChange={(v) => { setUtmCampaignFilter(v); setCurrentPage(0); }}
              utmContentFilter={utmContentFilter}
              onUtmContentFilterChange={(v) => { setUtmContentFilter(v); setCurrentPage(0); }}
              utmTermFilter={utmTermFilter}
              onUtmTermFilterChange={(v) => { setUtmTermFilter(v); setCurrentPage(0); }}
              qualifiedFilter={qualifiedFilter}
              onQualifiedFilterChange={(v) => { setQualifiedFilter(v as 'all' | 'qualified' | 'unqualified'); setCurrentPage(0); }}
              testFilter={testFilter}
              onTestFilterChange={(v) => { setTestFilter(v); setCurrentPage(0); }}
              pageFilter={pageFilter}
              onPageFilterChange={(v) => { setPageFilter(v); setCurrentPage(0); }}
              trafficTypeFilter={trafficTypeFilter}
              onTrafficTypeFilterChange={(v) => { setTrafficTypeFilter(v); setCurrentPage(0); }}
              showAllPages={showAllPages}
              onShowAllPages={() => setShowAllPages(true)}
              totalPagesCount={totalPagesCount}
              hiddenPagesCount={hiddenPagesCount}
              totalLeads={stats?.total || 0}
              testLeadsCount={testLeadsCount}
              filterOptions={filterOptions}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
            />
          </CardContent>
        </Card>

        {/* Chart + Top Ads - Lazy loaded */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2 h-[420px]">
              <Card className="h-full flex flex-col">
                <Tabs value={chartTab} onValueChange={(v) => setChartTab(v as 'daily' | 'evolution')} className="flex flex-col h-full">
                  <div className="px-4 pt-4 pb-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="daily" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Leads por Dia</span>
                        <span className="sm:hidden">Por Dia</span>
                      </TabsTrigger>
                      <TabsTrigger value="evolution" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="hidden sm:inline">Evolução {topMode === 'ads' ? 'Anúncios' : 'Campanhas'}</span>
                        <span className="sm:hidden">Evolução</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <CardContent className="pt-2 flex-1 overflow-hidden">
                    <TabsContent value="daily" className="mt-0 h-full">
                      <LeadsByDayChart 
                        data={stats?.byDay || {}} 
                        isLoading={isLoadingStats} 
                        embedded 
                      />
                    </TabsContent>
                    <TabsContent value="evolution" className="mt-0 h-full">
                      <AdTrendChart
                        leads={paginatedData?.leads}
                        topItemNames={topItemNames}
                        mode={topMode}
                        groupBy={trendGroupBy}
                        onGroupByChange={setTrendGroupBy}
                        isLoading={isLoadingLeads}
                        embedded
                      />
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
            <div className="lg:col-span-1 h-[420px]">
              <TopAdsCard
                topItems={topItems} 
                totalCount={topAdsData?.totalCount || 0} 
                isLoading={isLoadingTopAds}
                mode={topMode}
                onModeChange={handleTopModeChange}
                selectedItem={selectedTopItem}
                onItemClick={(item) => {
                  setSelectedTopItem(item);
                  setCurrentPage(0);
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Landing Page Comparison - Only show if there are multiple pages */}
        {showCharts && landingPageStats.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <LandingPageComparisonCard
              stats={landingPageStats}
              conversionStats={conversionStats}
              isLoading={isLoadingLeads || isLoadingConversion}
              selectedPage={pageFilter !== 'all' ? pageFilter : null}
              onPageClick={(page) => {
                setPageFilter(page || 'all');
                setCurrentPage(0);
              }}
              showAllPages={showAllPages}
              hiddenPagesCount={hiddenPagesCount}
              onToggleShowAll={() => setShowAllPages(true)}
            />
            <Card className="h-[300px]">
              <CardContent className="h-full pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Evolução de Landing Pages</span>
                </div>
                <div className="h-[calc(100%-30px)]">
                  <LandingPageTrendChart
                    stats={landingPageStats.slice(0, 5)}
                    dateRange={dateRange}
                    isLoading={isLoadingLeads}
                    embedded
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Interactive World Map - Lazy loaded */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LeadsWorldMap
              byCountry={stats?.byCountry || {}}
              isLoading={isLoadingStats}
              totalLeads={stats?.total || 0}
              onCountryClick={(country) => {
                setCountryFilter(country);
                setCurrentPage(0);
              }}
            />
          </motion.div>
        )}

        {/* Geographic Distribution Charts - Lazy loaded */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LeadsByCountryChart
              byCountry={stats?.byCountry || {}}
              byCity={stats?.byCity || {}}
              isLoading={isLoadingStats}
              totalLeads={stats?.total || 0}
              hideUnidentified={hideUnidentifiedGeo}
              onToggleUnidentified={() => setHideUnidentifiedGeo(!hideUnidentifiedGeo)}
            />
          </motion.div>
        )}

        {/* Selected Filter Indicator */}
        {selectedTopItem && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20"
          >
            <span className="text-sm text-primary font-medium">
              Filtrando por {topMode === 'ads' ? 'anúncio' : 'campanha'}:
            </span>
            <span className="text-sm font-semibold truncate max-w-[300px]">{selectedTopItem}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTopItem(null)}
              className="h-6 w-6 p-0 ml-auto hover:bg-primary/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isLoadingLeads ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </Card>
          ) : (
            <LeadsTable leads={paginatedData?.leads || []} hasActiveFilters={hasActiveFilters} />
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {currentPage * ITEMS_PER_PAGE + 1} a{' '}
              {Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} de {totalCount.toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default Leads;
