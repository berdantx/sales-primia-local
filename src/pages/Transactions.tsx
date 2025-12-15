import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTransactions } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Filter, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  X
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

function Transactions() {
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filters = useMemo(() => ({
    startDate: subDays(new Date(), 365),
    endDate: new Date(),
  }), []);

  const { data: transactions, isLoading, error } = useTransactions(filters);

  // Debug logging
  console.log('Transactions state:', { isLoading, count: transactions?.length, error });

  // Get unique currencies and countries for filters
  const { currencies, countries } = useMemo(() => {
    if (!transactions) return { currencies: [], countries: [] };
    
    const currencySet = new Set<string>();
    const countrySet = new Set<string>();
    
    transactions.forEach(t => {
      currencySet.add(t.currency);
      if (t.country) countrySet.add(t.country);
    });
    
    return {
      currencies: Array.from(currencySet).sort(),
      countries: Array.from(countrySet).sort(),
    };
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      const matchesSearch = !search || 
        t.product?.toLowerCase().includes(search.toLowerCase()) ||
        t.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.buyer_email?.toLowerCase().includes(search.toLowerCase()) ||
        t.transaction_code.toLowerCase().includes(search.toLowerCase());
      
      const matchesCurrency = currencyFilter === 'all' || t.currency === currencyFilter;
      const matchesCountry = countryFilter === 'all' || t.country === countryFilter;
      
      return matchesSearch && matchesCurrency && matchesCountry;
    });
  }, [transactions, search, currencyFilter, countryFilter]);

  // Paginate
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const handleExportCSV = () => {
    const headers = ['Código', 'Produto', 'Comprador', 'Email', 'Moeda', 'País', 'Valor', 'Data'];
    const rows = filteredTransactions.map(t => [
      t.transaction_code,
      t.product || '',
      t.buyer_name || '',
      t.buyer_email || '',
      t.currency,
      t.country || '',
      t.computed_value,
      t.purchase_date ? format(parseISO(t.purchase_date), 'dd/MM/yyyy') : '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSearch('');
    setCurrencyFilter('all');
    setCountryFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = search || currencyFilter !== 'all' || countryFilter !== 'all';

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
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Transações</h1>
            <p className="text-muted-foreground">
              {filteredTransactions.length} transações encontradas
            </p>
          </div>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por produto, cliente ou código..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={currencyFilter} onValueChange={(v) => { setCurrencyFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Moeda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas moedas</SelectItem>
                  {currencies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="País" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos países</SelectItem>
                  {countries.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">
                      {transaction.transaction_code.slice(0, 12)}...
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
                    <TableCell>
                      <Badge variant="outline">{transaction.currency}</Badge>
                    </TableCell>
                    <TableCell>{transaction.country || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(transaction.computed_value), transaction.currency)}
                    </TableCell>
                    <TableCell>
                      {transaction.purchase_date 
                        ? format(parseISO(transaction.purchase_date), 'dd/MM/yy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {hasActiveFilters 
                          ? 'Nenhuma transação encontrada com os filtros aplicados'
                          : 'Nenhuma transação ainda. Importe uma planilha para começar.'
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

export default Transactions;
