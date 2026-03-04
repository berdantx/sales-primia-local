import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useLeadsPaginated } from '@/hooks/useLeadsPaginated';
import { useLeadStatsOptimized } from '@/hooks/useLeadStatsOptimized';
import { useTopAdsOptimized } from '@/hooks/useTopAdsOptimized';
import { useClients } from '@/hooks/useClients';

import { useLandingPageStats } from '@/hooks/useLandingPageStats';
import { useLandingPageConversion } from '@/hooks/useLandingPageConversion';
import { TopAdsCard } from '@/components/leads/TopAdsCard';
import { AdTrendChartOptimized } from '@/components/leads/AdTrendChartOptimized';
import { LeadsByCountryChart } from '@/components/leads/LeadsByCountryChart';
import { LeadsWorldMap } from '@/components/leads/LeadsWorldMap';
import { LandingPageComparisonCard } from '@/components/leads/LandingPageComparisonCard';
import { LandingPageTrendChart } from '@/components/leads/LandingPageTrendChart';
import { IAQLCard } from '@/components/leads/IAQLCard';
import { ActiveClientBlock } from '@/components/layout/ActiveClientBlock';
import { ChannelComparisonCards } from '@/components/leads/ChannelComparisonCards';
import { DiagnosticBullets } from '@/components/leads/DiagnosticBullets';
import { useFilter } from '@/contexts/FilterContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ExecutiveKPICard } from '@/components/dashboard/ExecutiveKPICard';
import { ClientSideExportDialog } from '@/components/leads/ClientSideExportDialog';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadsCompactFilters } from '@/components/leads/LeadsCompactFilters';
import { LeadsActiveFilters } from '@/components/leads/LeadsActiveFilters';
import { LeadsByDayChart } from '@/components/leads/LeadsByDayChart';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  Megaphone,
  Eye,
  Zap,
  Briefcase,
  Clock,
} from 'lucide-react';

const ITEMS_PER_PAGE = 50;

type ViewMode = 'ads' | 'campaigns' | 'pages';
type GroupBy = 'day' | 'week';

// Compute IAQL score from stats
function computeIAQL(stats: {
  total: number;
  byTrafficType: Record<string, number>;
  bySource: Record<string, number>;
  byUtmSource: Record<string, number>;
}): { score: number; interpretation: string } {
  if (stats.total === 0) return { score: 0, interpretation: 'Sem dados suficientes para calcular.' };

  const paid = stats.byTrafficType['paid'] || 0;
  const organic = stats.byTrafficType['organic'] || 0;
  const direct = stats.byTrafficType['direct'] || 0;
  const total = stats.total;

  // Diversity of sources (more sources = healthier)
  const sourceCount = Object.keys(stats.bySource).length;
  const sourceDiversity = Math.min(sourceCount * 8, 25); // max 25 pts

  // UTM coverage (qualified leads)
  const utmCount = Object.values(stats.byUtmSource).reduce((a, b) => a + b, 0);
  const utmCoverage = total > 0 ? (utmCount / total) * 100 : 0;
  const utmScore = Math.min(utmCoverage * 0.3, 25); // max 25 pts

  // Channel balance (penalize over-reliance on single channel)
  const paidShare = total > 0 ? paid / total : 0;
  const organicShare = total > 0 ? organic / total : 0;
  const balanceScore = Math.min(
    (1 - Math.abs(paidShare - organicShare)) * 25,
    25
  ); // max 25 pts

  // Volume factor
  const volumeScore = Math.min(Math.log10(Math.max(total, 1)) * 8, 25); // max 25 pts

  const score = Math.round(Math.min(sourceDiversity + utmScore + balanceScore + volumeScore, 100));

  let interpretation = '';
  if (score >= 80) interpretation = 'Qualidade excelente. Aquisição diversificada e consistente.';
  else if (score >= 65) interpretation = 'Qualidade saudável, conversão consistente.';
  else if (score >= 50) interpretation = 'Atenção: concentração de canais ou cobertura UTM baixa.';
  else interpretation = 'Crítico: diversificar fontes e melhorar rastreamento UTM.';

  return { score, interpretation };
}

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
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [topMode, setTopMode] = useState<ViewMode>('ads');
  const [trendGroupBy, setTrendGroupBy] = useState<GroupBy>('day');
  const [chartTab, setChartTab] = useState<'daily' | 'evolution'>('daily');
  const [selectedTopItem, setSelectedTopItem] = useState<string | null>(null);
  const [qualifiedFilter, setQualifiedFilter] = useState<string>('all');
  const [showCharts, setShowCharts] = useState(false);
  const [hideUnidentifiedGeo, setHideUnidentifiedGeo] = useState(false);
  
  const [activeTab, setActiveTab] = useState('crm');
  const { clientId, isReady } = useFilter();
  const queryClient = useQueryClient();

  const { data: clients } = useClients();
  const clientName = useMemo(() => {
    if (!clientId || !clients) return '';
    return clients.find(c => c.id === clientId)?.name || '';
  }, [clientId, clients]);

  useEffect(() => {
    const timer = setTimeout(() => setShowCharts(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const statsFilters = useMemo(() => ({
    startDate: dateRange?.from ? startOfDay(dateRange.from) : undefined,
    endDate: dateRange?.to ? endOfDay(dateRange.to) : undefined,
    clientId,
    trafficType: trafficTypeFilter !== 'all' ? trafficTypeFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    utmSource: utmSourceFilter !== 'all' ? utmSourceFilter : undefined,
    utmMedium: utmMediumFilter !== 'all' ? utmMediumFilter : undefined,
    utmCampaign: utmCampaignFilter !== 'all' ? utmCampaignFilter : undefined,
  }), [clientId, dateRange, trafficTypeFilter, sourceFilter, utmSourceFilter, utmMediumFilter, utmCampaignFilter]);

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

  const { data: stats, isLoading: isLoadingStats } = useLeadStatsOptimized(isReady ? statsFilters : undefined);

  const { data: topAdsData, isLoading: isLoadingTopAds } = useTopAdsOptimized(isReady ? {
    ...statsFilters,
    mode: topMode,
    limit: 10,
  } : undefined);

  const { data: paginatedData, isLoading: isLoadingLeads } = useLeadsPaginated({
    filters: isReady ? paginatedFilters : undefined,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  });

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
  
  const { conversionStats, totalConversion, isLoading: isLoadingConversion } = useLandingPageConversion({
    clientId,
    leads: paginatedData?.leads || [],
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });

  const filterOptions = useMemo(() => {
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

  const isTestLead = (tags: string | null) => {
    if (!tags) return false;
    return tags.includes('[TESTE]') || tags.toLowerCase().includes('teste');
  };

  const testLeadsCount = useMemo(() => {
    if (!paginatedData?.leads) return 0;
    return paginatedData.leads.filter(l => isTestLead(l.tags)).length;
  }, [paginatedData?.leads]);

  const totalPages = paginatedData?.totalPages || 1;
  const totalCount = paginatedData?.totalCount || 0;

  const resetLeadFilters = () => {
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
    setSelectedPeriod('all');
    setDateRange(undefined);
    setShowAllPages(false);
    setCurrentPage(0);
    setSelectedTopItem(null);
  };

  const clearFilters = () => {
    resetLeadFilters();
  };

  useEffect(() => {
    if (!isReady) return;
    resetLeadFilters();
  }, [clientId, isReady]);

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
    selectedPeriod !== 'all' || 
    selectedTopItem
  );

  // Count filters in the advanced drawer (not in compact bar)
  const advancedFiltersCount = [
    countryFilter !== 'all',
    utmSourceFilter !== 'all',
    utmMediumFilter !== 'all',
    utmCampaignFilter !== 'all',
    utmContentFilter !== 'all',
    utmTermFilter !== 'all',
    qualifiedFilter !== 'all',
    testFilter !== 'hide',
    pageFilter !== 'all',
    trafficTypeFilter !== 'all',
  ].filter(Boolean).length;

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

  const handleTopModeChange = (mode: ViewMode) => {
    setTopMode(mode);
    setSelectedTopItem(null);
  };

  const handleDeleteTestLeads = async () => {
    setIsDeleting(true);
    try {
      let query = supabase.from('leads').select('id, tags');
      if (paginatedFilters.clientId) query = query.eq('client_id', paginatedFilters.clientId);
      if (paginatedFilters.startDate) query = query.gte('created_at', paginatedFilters.startDate.toISOString());
      if (paginatedFilters.endDate) query = query.lte('created_at', paginatedFilters.endDate.toISOString());

      const { data: allLeads, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const testLeadIds = (allLeads || []).filter(l => isTestLead(l.tags)).map(l => l.id);
      if (testLeadIds.length === 0) { toast.info('Não há leads de teste para deletar.'); return; }

      const { error } = await supabase.from('leads').delete().in('id', testLeadIds);
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

  // IAQL computation
  const iaql = useMemo(() => {
    if (!stats) return { score: 0, interpretation: 'Carregando...' };
    return computeIAQL({
      total: stats.total,
      byTrafficType: stats.byTrafficType,
      bySource: stats.bySource,
      byUtmSource: stats.byUtmSource,
    });
  }, [stats]);

  // Derived KPIs
  const qualifiedLeads = useMemo(() => {
    if (!stats) return 0;
    return Object.values(stats.byUtmSource).reduce((a, b) => a + b, 0);
  }, [stats]);

  const avgDaily = useMemo(() => {
    if (!stats?.byDay) return '0';
    const days = Math.max(Object.keys(stats.byDay).length, 1);
    return (stats.total / days).toFixed(1);
  }, [stats]);

  const topContentName = useMemo(() => {
    return topAdsData?.items?.[0]?.name || undefined;
  }, [topAdsData]);

  const isLoading = !isReady || isLoadingStats;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 sm:space-y-8">
          {/* Skeleton header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-xl" />
          </div>
          {/* Skeleton KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>

      <div className="space-y-6 sm:space-y-8">
        {/* ── HEADER INSTITUCIONAL ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-3">
            <ActiveClientBlock />
            <ClientContextHeader 
              title="Leads"
              description="Inteligência de Aquisição e Gestão Comercial"
            />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalCount.toLocaleString('pt-BR')} leads no período
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {testLeadsCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1.5" />
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
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deletando...</>
                      ) : (
                        <><Trash2 className="h-4 w-4 mr-2" />Deletar leads de teste</>
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
            >
              {isBackfilling ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processando...</>
              ) : (
                <><MapPin className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Atualizar Geo</span><span className="sm:hidden">Geo</span></>
              )}
            </Button>
            <ClientSideExportDialog 
              activeFilters={{
                source: sourceFilter !== 'all' ? sourceFilter : undefined,
                utmSource: utmSourceFilter !== 'all' ? utmSourceFilter : undefined,
                utmMedium: utmMediumFilter !== 'all' ? utmMediumFilter : undefined,
                utmCampaign: utmCampaignFilter !== 'all' ? utmCampaignFilter : undefined,
                utmContent: utmContentFilter !== 'all' ? utmContentFilter : undefined,
                utmTerm: utmTermFilter !== 'all' ? utmTermFilter : undefined,
                trafficType: trafficTypeFilter !== 'all' ? trafficTypeFilter : undefined,
                country: countryFilter !== 'all' ? countryFilter : undefined,
                pageUrl: pageFilter !== 'all' ? pageFilter : undefined,
                search: search || undefined,
              }}
              filterOptions={{
                sources: filterOptions.sources,
                utmSources: filterOptions.utmSources,
                utmMediums: filterOptions.utmMediums,
                utmCampaigns: filterOptions.utmCampaigns,
                utmContents: filterOptions.utmContents,
                utmTerms: filterOptions.utmTerms,
                trafficTypes: filterOptions.trafficTypes,
                countries: filterOptions.countries,
                pages: filterOptions.pages,
              }}
            />
          </div>
        </div>

        {/* ── IAQL — Soberano (acima dos filtros) ── */}
        <IAQLCard
          score={iaql.score}
          interpretation={iaql.interpretation}
          isLoading={isLoadingStats}
        />

        {/* ── FILTROS COMPACTOS ── */}
        <LeadsCompactFilters
          selectedPeriod={selectedPeriod}
          dateRange={dateRange}
          onPeriodChange={(period) => { setSelectedPeriod(period); setCurrentPage(0); }}
          onDateRangeChange={(range) => { setDateRange(range); setCurrentPage(0); }}
          search={search}
          onSearchChange={(value) => { setSearch(value); setCurrentPage(0); }}
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
          onQualifiedFilterChange={(v) => { setQualifiedFilter(v); setCurrentPage(0); }}
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
          advancedFiltersCount={advancedFiltersCount}
        />

        {/* ── FILTROS ATIVOS (chips) ── */}
        <LeadsActiveFilters
          search={search}
          onSearchClear={() => { setSearch(''); setCurrentPage(0); }}
          sourceFilter={sourceFilter}
          onSourceClear={() => { setSourceFilter('all'); setCurrentPage(0); }}
          countryFilter={countryFilter}
          onCountryClear={() => { setCountryFilter('all'); setCurrentPage(0); }}
          utmSourceFilter={utmSourceFilter}
          onUtmSourceClear={() => { setUtmSourceFilter('all'); setCurrentPage(0); }}
          utmMediumFilter={utmMediumFilter}
          onUtmMediumClear={() => { setUtmMediumFilter('all'); setCurrentPage(0); }}
          utmCampaignFilter={utmCampaignFilter}
          onUtmCampaignClear={() => { setUtmCampaignFilter('all'); setCurrentPage(0); }}
          utmContentFilter={utmContentFilter}
          onUtmContentClear={() => { setUtmContentFilter('all'); setCurrentPage(0); }}
          utmTermFilter={utmTermFilter}
          onUtmTermClear={() => { setUtmTermFilter('all'); setCurrentPage(0); }}
          qualifiedFilter={qualifiedFilter}
          onQualifiedClear={() => { setQualifiedFilter('all'); setCurrentPage(0); }}
          testFilter={testFilter}
          onTestClear={() => { setTestFilter('hide'); setCurrentPage(0); }}
          pageFilter={pageFilter}
          onPageClear={() => { setPageFilter('all'); setCurrentPage(0); }}
          trafficTypeFilter={trafficTypeFilter}
          onTrafficTypeClear={() => { setTrafficTypeFilter('all'); setCurrentPage(0); }}
          selectedTopItem={selectedTopItem}
          onTopItemClear={() => setSelectedTopItem(null)}
          onClearAll={clearFilters}
        />

        {/* ── TABS ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3 h-11">
            <TabsTrigger value="strategic" className="gap-1.5 text-xs sm:text-sm">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Estratégica</span>
              <span className="sm:hidden">Estratégica</span>
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-1.5 text-xs sm:text-sm">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Inteligência</span>
              <span className="sm:hidden">Inteligência</span>
            </TabsTrigger>
            <TabsTrigger value="crm" className="gap-1.5 text-xs sm:text-sm">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">CRM & Operação</span>
              <span className="sm:hidden">CRM</span>
            </TabsTrigger>
          </TabsList>

          {/* ════════ TAB 1: VISÃO ESTRATÉGICA ════════ */}
          <TabsContent value="strategic" className="space-y-6 mt-0">

            {/* KPIs operacionais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              <ExecutiveKPICard
                label="Total de Leads"
                value={stats?.total?.toLocaleString('pt-BR') || '0'}
                microLabel="VOLUME"
                icon={Users}
                accentColor="border-t-violet-400"
                iconClassName="bg-violet-500/10 text-violet-600"
              />
              <ExecutiveKPICard
                label="Leads Qualificados"
                value={qualifiedLeads.toLocaleString('pt-BR')}
                microLabel="COM UTMs"
                subtitle={stats && stats.total > 0 ? `${((qualifiedLeads / stats.total) * 100).toFixed(1)}% do total` : undefined}
                icon={Target}
                accentColor="border-t-blue-400"
                iconClassName="bg-blue-500/10 text-blue-600"
              />
              <ExecutiveKPICard
                label="Média Diária"
                value={avgDaily}
                microLabel="RITMO"
                subtitle="leads por dia"
                icon={TrendingUp}
                accentColor="border-t-emerald-400"
                iconClassName="bg-emerald-500/10 text-emerald-600"
              />
              <ExecutiveKPICard
                label="Fontes"
                value={Object.keys(stats?.bySource || {}).length.toString()}
                microLabel="DIVERSIFICAÇÃO"
                subtitle="origens ativas"
                icon={Globe}
                accentColor="border-t-amber-400"
                iconClassName="bg-amber-500/10 text-amber-600"
              />
            </div>

            {/* Diagnóstico Rápido - na aba estratégica */}
            <DiagnosticBullets
              byTrafficType={stats?.byTrafficType || {}}
              byCountry={stats?.byCountry || {}}
              topContentName={topContentName}
              total={stats?.total || 0}
            />

            {/* Funnel Summary Link */}
            <Card className="border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] rounded-xl">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/5">
                      <Target className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Funil de Conversão</h3>
                      <p className="text-xs text-muted-foreground">
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

            {/* Main Chart */}
            {showCharts && (
              <Card className="rounded-xl border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    <span className="text-sm font-semibold text-foreground">Captação por Dia</span>
                  </div>
                  <div className="h-[320px]">
                    <LeadsByDayChart 
                      data={stats?.byDay || {}} 
                      isLoading={isLoadingStats} 
                      embedded 
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ════════ TAB 2: INTELIGÊNCIA DE AQUISIÇÃO ════════ */}
          <TabsContent value="intelligence" className="space-y-6 mt-0">
            {/* Channel Comparison */}
            <ChannelComparisonCards
              byTrafficType={stats?.byTrafficType || {}}
              total={stats?.total || 0}
              isLoading={isLoadingStats}
            />

            {/* Rankings: Top Ads + Chart */}
            {showCharts && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                <div className="lg:col-span-2 h-[420px]">
                  <Card className="h-full flex flex-col rounded-xl border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <Tabs value={chartTab} onValueChange={(v) => setChartTab(v as 'daily' | 'evolution')} className="flex flex-col h-full">
                      <div className="px-4 pt-4 pb-2">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="daily" className="flex items-center gap-2 text-xs">
                            <BarChart3 className="h-4 w-4" />
                            Leads por Dia
                          </TabsTrigger>
                          <TabsTrigger value="evolution" className="flex items-center gap-2 text-xs">
                            <TrendingUp className="h-4 w-4" />
                            Evolução {topMode === 'ads' ? 'Anúncios' : topMode === 'campaigns' ? 'Campanhas' : 'Páginas'}
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
                          <AdTrendChartOptimized
                            clientId={clientId}
                            startDate={dateRange?.from}
                            endDate={dateRange?.to}
                            topItemNames={topItemNames}
                            mode={topMode}
                            groupBy={trendGroupBy}
                            onGroupByChange={setTrendGroupBy}
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
                    onItemClick={(item) => { setSelectedTopItem(item); setCurrentPage(0); }}
                  />
                </div>
              </div>
            )}

            {/* Landing Pages */}
            {showCharts && landingPageStats.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                <LandingPageComparisonCard
                  stats={landingPageStats}
                  conversionStats={conversionStats}
                  isLoading={isLoadingLeads || isLoadingConversion}
                  selectedPage={pageFilter !== 'all' ? pageFilter : null}
                  onPageClick={(page) => { setPageFilter(page || 'all'); setCurrentPage(0); }}
                  showAllPages={showAllPages}
                  hiddenPagesCount={hiddenPagesCount}
                  onToggleShowAll={() => setShowAllPages(true)}
                />
                <Card className="h-[300px] rounded-xl border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <CardContent className="h-full pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" strokeWidth={1.75} />
                      <span className="text-sm font-semibold">Evolução de Landing Pages</span>
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
              </div>
            )}

            {/* Diagnostic Bullets */}
            <DiagnosticBullets
              byTrafficType={stats?.byTrafficType || {}}
              byCountry={stats?.byCountry || {}}
              topContentName={topContentName}
              total={stats?.total || 0}
            />

            {/* Geo */}
            {showCharts && (
              <>
                <LeadsWorldMap
                  byCountry={stats?.byCountry || {}}
                  isLoading={isLoadingStats}
                  totalLeads={stats?.total || 0}
                  onCountryClick={(country) => { setCountryFilter(country); setCurrentPage(0); }}
                />
                <LeadsByCountryChart
                  byCountry={stats?.byCountry || {}}
                  byCity={stats?.byCity || {}}
                  isLoading={isLoadingStats}
                  totalLeads={stats?.total || 0}
                  hideUnidentified={hideUnidentifiedGeo}
                  onToggleUnidentified={() => setHideUnidentifiedGeo(!hideUnidentifiedGeo)}
                />
              </>
            )}
          </TabsContent>

          {/* ════════ TAB 3: CRM & OPERAÇÃO ════════ */}
          <TabsContent value="crm" className="space-y-6 mt-0">

            {/* Table */}
            {isLoadingLeads ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <LeadsTable leads={paginatedData?.leads || []} hasActiveFilters={hasActiveFilters} />
            )}

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
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default Leads;
