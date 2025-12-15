import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTmbTransactions } from '@/hooks/useTmbTransactions';
import { useTmbTransactionStatsOptimized } from '@/hooks/useTmbTransactionStatsOptimized';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  X,
  DollarSign,
  Receipt,
  Package
} from 'lucide-react';
import { ColoredKPICard } from '@/components/dashboard/ColoredKPICard';

const ITEMS_PER_PAGE = 20;

function TmbTransactions() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filters = useMemo(() => ({
    startDate: subDays(new Date(), 365),
    endDate: new Date(),
    search: search || undefined,
  }), [search]);

  const { data: transactions, isLoading, error } = useTmbTransactions(filters);
  const { data: stats, isLoading: isLoadingStats } = useTmbTransactionStatsOptimized({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  // Get top product
  const topProduct = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    
    const productMap = new Map<string, { total: number; count: number }>();
    transactions.forEach(t => {
      const product = t.product || 'Desconhecido';
      const current = productMap.get(product) || { total: 0, count: 0 };
      productMap.set(product, {
        total: current.total + Number(t.ticket_value),
        count: current.count + 1,
      });
    });

    const sorted = Array.from(productMap.entries())
      .sort(([, a], [, b]) => b.total - a.total);
    
    return sorted[0] ? { name: sorted[0][0], total: sorted[0][1].total } : null;
  }, [transactions]);

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!search) return transactions;
    
    const lowerSearch = search.toLowerCase();
    return transactions.filter(t =>
      t.product?.toLowerCase().includes(lowerSearch) ||
      t.buyer_name?.toLowerCase().includes(lowerSearch) ||
      t.buyer_email?.toLowerCase().includes(lowerSearch) ||
      t.order_id.toLowerCase().includes(lowerSearch)
    );
  }, [transactions, search]);

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const handleExportCSV = () => {
    const headers = ['ID Pedido', 'Produto', 'Cliente', 'Email', 'Valor', 'Data', 'UTM Source', 'UTM Medium', 'UTM Campaign'];
    const rows = filteredTransactions.map(t => [
      t.order_id,
      t.product || '',
      t.buyer_name || '',
      t.buyer_email || '',
      t.ticket_value,
      t.effective_date ? format(parseISO(t.effective_date), 'dd/MM/yyyy HH:mm') : '',
      t.utm_source || '',
      t.utm_medium || '',
      t.utm_campaign || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmb-transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters = !!search;

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
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Transações TMB</h1>
            <p className="text-muted-foreground">
              {filteredTransactions.length} transações encontradas
            </p>
          </div>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </motion.div>

        {/* Summary KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <ColoredKPICard
            title="Total em Reais"
            value={formatCurrency(stats?.totalBRL || 0, 'BRL')}
            subtitle={`${stats?.totalTransactions || 0} transações`}
            icon={DollarSign}
            variant="green"
            delay={0}
          />
          <ColoredKPICard
            title="Total de Transações"
            value={(stats?.totalTransactions || 0).toString()}
            subtitle="no período"
            icon={Receipt}
            variant="purple"
            delay={1}
          />
          {topProduct && (
            <ColoredKPICard
              title="Top Produto"
              value={topProduct.name.length > 25 ? topProduct.name.slice(0, 25) + '...' : topProduct.name}
              subtitle={formatCurrency(topProduct.total, 'BRL')}
              icon={Package}
              variant="blue"
              delay={2}
            />
          )}
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por produto, cliente, email ou ID..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>UTM Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">
                      {transaction.order_id.slice(0, 15)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.product || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="truncate font-medium">
                          {transaction.buyer_name || '-'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.buyer_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(transaction.ticket_value), 'BRL')}
                    </TableCell>
                    <TableCell>
                      {transaction.effective_date 
                        ? format(parseISO(transaction.effective_date), 'dd/MM/yy HH:mm', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {transaction.utm_source ? (
                        <Badge variant="outline" className="text-xs">
                          {transaction.utm_source}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {hasActiveFilters 
                          ? 'Nenhuma transação encontrada com os filtros aplicados'
                          : 'Nenhuma transação TMB ainda. Importe um arquivo para começar.'
                        }
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
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
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
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

export default TmbTransactions;
