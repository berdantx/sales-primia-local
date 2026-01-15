import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useLeads, useLeadStats } from '@/hooks/useLeads';
import { useFilter } from '@/contexts/FilterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadsByDayChart } from '@/components/leads/LeadsByDayChart';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';
import { getDateRangeBrasiliaUTC } from '@/lib/dateUtils';
import { format } from 'date-fns';
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
  Trash2
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

function Leads() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>('all');
  const [testFilter, setTestFilter] = useState<string>('hide'); // 'all' | 'hide' | 'only'
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { clientId } = useFilter();
  const queryClient = useQueryClient();

  const filters = useMemo(() => {
    const range = getDateRangeBrasiliaUTC(365);
    return {
      startDate: range.startDate,
      endDate: range.endDate,
      clientId,
    };
  }, [clientId]);

  const { data: leads, isLoading } = useLeads(filters);
  const { stats, isLoading: isLoadingStats } = useLeadStats(filters);

  // Get unique sources and utm_sources for filters
  const { sources, utmSources } = useMemo(() => {
    if (!leads) return { sources: [], utmSources: [] };
    
    const sourceSet = new Set<string>();
    const utmSourceSet = new Set<string>();
    
    leads.forEach(l => {
      if (l.source) sourceSet.add(l.source);
      if (l.utm_source) utmSourceSet.add(l.utm_source);
    });
    
    return {
      sources: Array.from(sourceSet).sort(),
      utmSources: Array.from(utmSourceSet).sort(),
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
      const matchesUtmSource = utmSourceFilter === 'all' || l.utm_source === utmSourceFilter;
      
      // Test filter
      const isTest = isTestLead(l.tags);
      const matchesTestFilter = 
        testFilter === 'all' || 
        (testFilter === 'hide' && !isTest) || 
        (testFilter === 'only' && isTest);
      
      return matchesSearch && matchesSource && matchesUtmSource && matchesTestFilter;
    });
  }, [leads, search, sourceFilter, utmSourceFilter, testFilter]);

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

  const handleExportCSV = () => {
    const headers = ['Data', 'Nome', 'Email', 'Telefone', 'Fonte', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Tags', 'Página'];
    const rows = filteredLeads.map(l => [
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
    a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('all');
    setUtmSourceFilter('all');
    setTestFilter('hide');
    setCurrentPage(1);
  };

  const hasActiveFilters = search || sourceFilter !== 'all' || utmSourceFilter !== 'all' || testFilter !== 'hide';

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

  if (isLoading || isLoadingStats) {
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
            <Button variant="outline" onClick={handleExportCSV} size="sm" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
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

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <LeadsByDayChart data={stats?.byDay || {}} isLoading={isLoadingStats} />
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
              
              <div className="flex gap-2">
                <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-sm">
                    <SelectValue placeholder="Fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    {sources.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={utmSourceFilter} onValueChange={(v) => { setUtmSourceFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-sm">
                    <SelectValue placeholder="UTM Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos UTM</SelectItem>
                    {utmSources.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={testFilter} onValueChange={(v) => { setTestFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px] sm:w-[140px] h-9 text-sm">
                    <FlaskConical className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="Teste" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Ocultar testes</SelectItem>
                    <SelectItem value="all">Mostrar todos</SelectItem>
                    <SelectItem value="only">Apenas testes</SelectItem>
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
