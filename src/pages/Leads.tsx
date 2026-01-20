import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useLeads, useLeadStats } from '@/hooks/useLeads';
import { useTopItems, ViewMode } from '@/hooks/useTopAds';
import { useLandingPageStats } from '@/hooks/useLandingPageStats';
import { TopAdsCard } from '@/components/leads/TopAdsCard';
import { AdTrendChart } from '@/components/leads/AdTrendChart';
import { LeadsByCountryChart } from '@/components/leads/LeadsByCountryChart';
import { LeadsWorldMap } from '@/components/leads/LeadsWorldMap';
import { LandingPageComparisonCard } from '@/components/leads/LandingPageComparisonCard';
import { LandingPageTrendChart } from '@/components/leads/LandingPageTrendChart';
import { GroupBy } from '@/hooks/useAdTrend';
import { useFilter } from '@/contexts/FilterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadsByDayChart } from '@/components/leads/LeadsByDayChart';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { LeadsPeriodFilter } from '@/components/leads/LeadsPeriodFilter';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
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
  Search, 
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
  FileText
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

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
  const [testFilter, setTestFilter] = useState<string>('hide'); // 'all' | 'hide' | 'only'
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
  
  const { clientId, isReady } = useFilter();
  const queryClient = useQueryClient();

  const filters = useMemo(() => {
    return {
      startDate: dateRange?.from ? startOfDay(dateRange.from) : undefined,
      endDate: dateRange?.to ? endOfDay(dateRange.to) : undefined,
      clientId,
    };
  }, [clientId, dateRange]);

  const { data: leads, isLoading } = useLeads(isReady ? filters : undefined);
  const { stats, isLoading: isLoadingStats } = useLeadStats(isReady ? filters : undefined);
  const { topItems, totalCount } = useTopItems({ leads, mode: topMode });
  const { stats: landingPageStats, totalPagesCount, pageOptions } = useLandingPageStats({ leads, limit: 10 });
  const topItemNames = useMemo(() => topItems.map(item => item.name), [topItems]);

  // Get unique sources, countries and utm values for filters with counts
  const filterOptions = useMemo(() => {
    if (!leads) return { 
      sources: [], countries: [], utmSources: [], utmMediums: [], utmCampaigns: [], utmContents: [], utmTerms: [], pages: [],
      sourceCounts: {}, countryCounts: {}, utmSourceCounts: {}, utmMediumCounts: {}, utmCampaignCounts: {}, utmContentCounts: {}, utmTermCounts: {}, pageCounts: {}
    };
    
    const sourceCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const utmSourceCounts: Record<string, number> = {};
    const utmMediumCounts: Record<string, number> = {};
    const utmCampaignCounts: Record<string, number> = {};
    const utmContentCounts: Record<string, number> = {};
    const utmTermCounts: Record<string, number> = {};
    const pageCounts: Record<string, number> = {};
    
    leads.forEach(l => {
      if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
      const country = l.country || 'Desconhecido';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
      if (l.utm_source) utmSourceCounts[l.utm_source] = (utmSourceCounts[l.utm_source] || 0) + 1;
      if (l.utm_medium) utmMediumCounts[l.utm_medium] = (utmMediumCounts[l.utm_medium] || 0) + 1;
      if (l.utm_campaign) utmCampaignCounts[l.utm_campaign] = (utmCampaignCounts[l.utm_campaign] || 0) + 1;
      if (l.utm_content) utmContentCounts[l.utm_content] = (utmContentCounts[l.utm_content] || 0) + 1;
      if (l.utm_term) utmTermCounts[l.utm_term] = (utmTermCounts[l.utm_term] || 0) + 1;
      const normalizedPage = normalizePageUrl(l.page_url);
      if (normalizedPage) pageCounts[normalizedPage] = (pageCounts[normalizedPage] || 0) + 1;
    });
    
    return {
      sources: Object.keys(sourceCounts).sort(),
      countries: Object.keys(countryCounts).sort((a, b) => countryCounts[b] - countryCounts[a]),
      utmSources: Object.keys(utmSourceCounts).sort(),
      utmMediums: Object.keys(utmMediumCounts).sort(),
      utmCampaigns: Object.keys(utmCampaignCounts).sort(),
      utmContents: Object.keys(utmContentCounts).sort(),
      utmTerms: Object.keys(utmTermCounts).sort(),
      pages: Object.keys(pageCounts).sort((a, b) => pageCounts[b] - pageCounts[a]),
      sourceCounts,
      countryCounts,
      utmSourceCounts,
      utmMediumCounts,
      utmCampaignCounts,
      utmContentCounts,
      utmTermCounts,
      pageCounts,
    };
  }, [leads]);

  // Check if lead is a test lead
  const isTestLead = (tags: string | null) => {
    if (!tags) return false;
    return tags.includes('[TESTE]') || tags.toLowerCase().includes('teste');
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(l => {
      const matchesSearch = !search || 
        l.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.phone?.toLowerCase().includes(search.toLowerCase());
      
      const matchesSource = sourceFilter === 'all' || l.source === sourceFilter;
      const matchesCountry = countryFilter === 'all' || 
        (countryFilter === 'unknown' && !l.country) ||
        l.country === countryFilter;
      const matchesUtmSource = utmSourceFilter === 'all' || l.utm_source === utmSourceFilter;
      const matchesUtmMedium = utmMediumFilter === 'all' || l.utm_medium === utmMediumFilter;
      const matchesUtmCampaign = utmCampaignFilter === 'all' || l.utm_campaign === utmCampaignFilter;
      const matchesUtmContent = utmContentFilter === 'all' || l.utm_content === utmContentFilter;
      const matchesUtmTerm = utmTermFilter === 'all' || l.utm_term === utmTermFilter;
      
      // Filter by selected top item (ad, campaign, or page)
      let matchesSelectedTopItem = true;
      if (selectedTopItem) {
        if (topMode === 'ads') {
          matchesSelectedTopItem = l.utm_content === selectedTopItem;
        } else if (topMode === 'campaigns') {
          matchesSelectedTopItem = l.utm_campaign === selectedTopItem;
        } else if (topMode === 'pages') {
          const normalizedLeadPage = normalizePageUrl(l.page_url);
          // selectedTopItem comes with "/" prefix from getPageDisplayName
          matchesSelectedTopItem = `/${normalizedLeadPage}` === selectedTopItem || normalizedLeadPage === selectedTopItem;
        }
      }

      // Filter by page dropdown
      const matchesPageFilter = pageFilter === 'all' || normalizePageUrl(l.page_url) === pageFilter;
      
      // Test filter
      const isTest = isTestLead(l.tags);
      const matchesTestFilter = 
        testFilter === 'all' || 
        (testFilter === 'hide' && !isTest) || 
        (testFilter === 'only' && isTest);
      
      return matchesSearch && matchesSource && matchesCountry && matchesUtmSource && matchesUtmMedium && matchesUtmCampaign && matchesUtmContent && matchesUtmTerm && matchesTestFilter && matchesSelectedTopItem && matchesPageFilter;
    });
  }, [leads, search, sourceFilter, countryFilter, utmSourceFilter, utmMediumFilter, utmCampaignFilter, utmContentFilter, utmTermFilter, testFilter, selectedTopItem, topMode, pageFilter]);

  // Count test leads
  const testLeadsCount = useMemo(() => {
    if (!leads) return 0;
    return leads.filter(l => isTestLead(l.tags)).length;
  }, [leads]);

  // Paginate
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeads.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);

  const handleExportCSV = (excludeTests: boolean = false) => {
    let leadsToExport = filteredLeads;
    
    if (excludeTests) {
      leadsToExport = filteredLeads.filter(l => !isTestLead(l.tags));
    }

    const headers = ['Data', 'Nome', 'Email', 'Telefone', 'Fonte', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Tags', 'Página'];
    const rows = leadsToExport.map(l => [
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'),
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
    
    toast.success(`${leadsToExport.length} leads exportados!`);
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
    setTestFilter('hide');
    setSelectedPeriod('30days');
    setDateRange({ from: subDays(new Date(), 30), to: new Date() });
    setCurrentPage(1);
    setSelectedTopItem(null);
  };

  const hasActiveFilters = search || sourceFilter !== 'all' || countryFilter !== 'all' || utmSourceFilter !== 'all' || utmMediumFilter !== 'all' || utmCampaignFilter !== 'all' || utmContentFilter !== 'all' || utmTermFilter !== 'all' || pageFilter !== 'all' || testFilter !== 'hide' || selectedPeriod !== '30days' || selectedTopItem;

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

  // Count leads without geolocation
  const leadsWithoutGeolocation = useMemo(() => {
    if (!leads) return 0;
    return leads.filter(l => !l.country && l.ip_address).length;
  }, [leads]);

  // Handle mode change - reset selected item when mode changes
  const handleTopModeChange = (mode: ViewMode) => {
    setTopMode(mode);
    setSelectedTopItem(null);
  };

  const handleDeleteTestLeads = async () => {
    if (!leads) return;
    
    const testLeadIds = leads.filter(l => isTestLead(l.tags)).map(l => l.id);
    if (testLeadIds.length === 0) {
      toast.info('Não há leads de teste para deletar.');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', testLeadIds);

      if (error) throw error;

      toast.success(`${testLeadIds.length} leads de teste deletados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-count'] });
    } catch (error) {
      console.error('Error deleting test leads:', error);
      toast.error('Erro ao deletar leads de teste.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isReady || isLoading || isLoadingStats) {
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
            description={`${filteredLeads.length} leads encontrados`}
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
                      Esta ação irá deletar permanentemente <strong>{testLeadsCount}</strong> leads de teste 
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
                          Deletar {testLeadsCount} leads
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {leadsWithoutGeolocation > 0 && (
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
                    <span className="ml-1">({leadsWithoutGeolocation})</span>
                  </>
                )}
              </Button>
            )}
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
                  Exportar todos ({filteredLeads.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV(true)}>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Apenas reais ({filteredLeads.filter(l => !isTestLead(l.tags)).length})
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
          className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4"
        >
          <ColoredKPICard
            title="Total de Leads"
            value={stats?.total.toString() || '0'}
            subtitle="no período"
            icon={Users}
            variant="blue"
            delay={0}
          />
          <ColoredKPICard
            title="Fontes Diferentes"
            value={Object.keys(stats?.bySource || {}).length.toString()}
            subtitle="origens de leads"
            icon={Globe}
            variant="purple"
            delay={1}
          />
          <ColoredKPICard
            title="Média Diária"
            value={stats?.byDay ? (stats.total / Math.max(Object.keys(stats.byDay).length, 1)).toFixed(1) : '0'}
            subtitle="leads por dia"
            icon={TrendingUp}
            variant="green"
            delay={2}
            className="col-span-2 lg:col-span-1"
          />
        </motion.div>

        {/* Filters - moved above chart */}
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col gap-3">
              {/* Date Range + Search Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <LeadsPeriodFilter
                  selectedPeriod={selectedPeriod}
                  dateRange={dateRange}
                  onPeriodChange={(period) => {
                    setSelectedPeriod(period);
                    setCurrentPage(1);
                  }}
                  onDateRangeChange={(range) => {
                    setDateRange(range);
                    setCurrentPage(1);
                  }}
                />
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar email, nome, telefone..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Other Filters Row */}
              <div className="flex flex-wrap gap-2">
                <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-sm">
                    <SelectValue placeholder="Fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas fontes ({leads?.length || 0})</SelectItem>
                    {filterOptions.sources.map(s => (
                      <SelectItem key={s} value={s}>
                        {s} ({filterOptions.sourceCounts[s]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-sm">
                    <Globe className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos países</SelectItem>
                    {filterOptions.countries.map(c => (
                      <SelectItem key={c} value={c}>
                        {c} ({filterOptions.countryCounts[c]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={utmSourceFilter} onValueChange={(v) => { setUtmSourceFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-sm">
                    <SelectValue placeholder="UTM Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Source</SelectItem>
                    {filterOptions.utmSources.map(s => (
                      <SelectItem key={s} value={s}>
                        {s} ({filterOptions.utmSourceCounts[s]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={utmMediumFilter} onValueChange={(v) => { setUtmMediumFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-sm">
                    <SelectValue placeholder="UTM Medium" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Medium</SelectItem>
                    {filterOptions.utmMediums.map(s => (
                      <SelectItem key={s} value={s}>
                        {s} ({filterOptions.utmMediumCounts[s]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={utmCampaignFilter} onValueChange={(v) => { setUtmCampaignFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-sm">
                    <SelectValue placeholder="UTM Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Campaign</SelectItem>
                    {filterOptions.utmCampaigns.map(s => (
                      <SelectItem key={s} value={s}>
                        {s} ({filterOptions.utmCampaignCounts[s]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={utmContentFilter} onValueChange={(v) => { setUtmContentFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-sm">
                    <SelectValue placeholder="UTM Content" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Content</SelectItem>
                    {filterOptions.utmContents.map(s => (
                      <SelectItem key={s} value={s}>
                        {s} ({filterOptions.utmContentCounts[s]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={utmTermFilter} onValueChange={(v) => { setUtmTermFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-sm">
                    <SelectValue placeholder="UTM Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Term</SelectItem>
                    {filterOptions.utmTerms.map(s => (
                      <SelectItem key={s} value={s}>
                        {s} ({filterOptions.utmTermCounts[s]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={testFilter} onValueChange={(v) => { setTestFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[150px] h-9 text-sm">
                    <FlaskConical className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="Teste" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Ocultar testes</SelectItem>
                    <SelectItem value="all">Mostrar todos</SelectItem>
                    <SelectItem value="only">Apenas testes ({testLeadsCount})</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={pageFilter} onValueChange={(v) => { setPageFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] sm:w-[180px] h-9 text-sm">
                    <FileText className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="Página" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas páginas ({totalPagesCount})</SelectItem>
                    {filterOptions.pages.map(p => (
                      <SelectItem key={p} value={p}>
                        /{p} ({filterOptions.pageCounts[p]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart + Top Ads */}
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
                      leads={leads}
                      topItemNames={topItemNames}
                      mode={topMode}
                      groupBy={trendGroupBy}
                      onGroupByChange={setTrendGroupBy}
                      isLoading={isLoading}
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
              totalCount={totalCount} 
              isLoading={isLoading}
              mode={topMode}
              onModeChange={handleTopModeChange}
              selectedItem={selectedTopItem}
              onItemClick={(item) => {
                setSelectedTopItem(item);
                setCurrentPage(1);
              }}
            />
          </div>
        </motion.div>

        {/* Landing Page Comparison - Only show if there are multiple pages */}
        {landingPageStats.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <LandingPageComparisonCard
              stats={landingPageStats}
              isLoading={isLoading}
              selectedPage={pageFilter !== 'all' ? pageFilter : null}
              onPageClick={(page) => {
                setPageFilter(page || 'all');
                setCurrentPage(1);
              }}
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
                    isLoading={isLoading}
                    embedded
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Interactive World Map */}
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
              setCurrentPage(1);
            }}
          />
        </motion.div>

        {/* Geographic Distribution Charts */}
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
          />
        </motion.div>

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
          <LeadsTable leads={paginatedLeads} hasActiveFilters={Boolean(hasActiveFilters)} />
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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
