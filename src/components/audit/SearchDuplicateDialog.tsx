import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFilter } from '@/contexts/FilterContext';
import { HotmartTransactionDetailDialog } from '@/components/hotmart/HotmartTransactionDetailDialog';
import { EduzzTransactionDetailDialog } from '@/components/eduzz/EduzzTransactionDetailDialog';
import { TmbTransactionDetailDialog } from '@/components/tmb/TmbTransactionDetailDialog';
import type { Transaction } from '@/hooks/useTransactions';
import type { EduzzTransaction } from '@/hooks/useEduzzTransactions';
import type { TmbTransaction } from '@/hooks/useTmbTransactions';
import { toast } from 'sonner';
import { formatDateTimeBR } from '@/lib/dateUtils';

type Platform = 'hotmart' | 'tmb' | 'eduzz';

interface SearchResult {
  id: string;
  platform: Platform;
  transactionId: string;
  email: string | null;
  buyer_name: string | null;
  value: number;
  date: string | null;
  source: string | null;
  product: string | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface SearchDuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDuplicateDialog({ open, onOpenChange }: SearchDuplicateDialogProps) {
  const { clientId } = useFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedHotmart, setSelectedHotmart] = useState<Transaction | null>(null);
  const [selectedEduzz, setSelectedEduzz] = useState<EduzzTransaction | null>(null);
  const [selectedTmb, setSelectedTmb] = useState<TmbTransaction | null>(null);

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) {
      toast.error('Digite um ID ou e-mail para buscar');
      return;
    }
    if (!clientId) {
      toast.error('Selecione um cliente primeiro');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    const allResults: SearchResult[] = [];

    try {
      const searchPlatforms = platformFilter === 'all' ? ['hotmart', 'tmb', 'eduzz'] : [platformFilter];

      // Search Hotmart
      if (searchPlatforms.includes('hotmart')) {
        const { data } = await supabase
          .from('transactions')
          .select('id, transaction_code, buyer_email, buyer_name, computed_value, purchase_date, source, product')
          .eq('client_id', clientId)
          .or(`transaction_code.ilike.%${term}%,buyer_email.ilike.%${term}%`)
          .limit(50);

        if (data) {
          for (const r of data) {
            allResults.push({
              id: r.id,
              platform: 'hotmart',
              transactionId: r.transaction_code,
              email: r.buyer_email,
              buyer_name: r.buyer_name,
              value: Number(r.computed_value) || 0,
              date: r.purchase_date,
              source: r.source,
              product: r.product,
            });
          }
        }
      }

      // Search TMB
      if (searchPlatforms.includes('tmb')) {
        const { data } = await supabase
          .from('tmb_transactions')
          .select('id, order_id, buyer_email, buyer_name, ticket_value, effective_date, source, product')
          .eq('client_id', clientId)
          .or(`order_id.ilike.%${term}%,buyer_email.ilike.%${term}%`)
          .limit(50);

        if (data) {
          for (const r of data) {
            allResults.push({
              id: r.id,
              platform: 'tmb',
              transactionId: r.order_id,
              email: r.buyer_email,
              buyer_name: r.buyer_name,
              value: Number(r.ticket_value) || 0,
              date: r.effective_date,
              source: r.source,
              product: r.product,
            });
          }
        }
      }

      // Search Eduzz
      if (searchPlatforms.includes('eduzz')) {
        const { data } = await supabase
          .from('eduzz_transactions')
          .select('id, sale_id, buyer_email, buyer_name, sale_value, sale_date, source, product')
          .eq('client_id', clientId)
          .or(`sale_id.ilike.%${term}%,buyer_email.ilike.%${term}%`)
          .limit(50);

        if (data) {
          for (const r of data) {
            allResults.push({
              id: r.id,
              platform: 'eduzz',
              transactionId: r.sale_id,
              email: r.buyer_email,
              buyer_name: r.buyer_name,
              value: Number(r.sale_value) || 0,
              date: r.sale_date,
              source: r.source,
              product: r.product,
            });
          }
        }
      }

      setResults(allResults);
    } catch {
      toast.error('Erro ao buscar duplicatas');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRowClick = async (recordId: string, platform: Platform) => {
    try {
      let data: any = null;
      let error: any = null;

      if (platform === 'hotmart') {
        const res = await supabase.from('transactions').select('*').eq('id', recordId).single();
        data = res.data; error = res.error;
      } else if (platform === 'eduzz') {
        const res = await supabase.from('eduzz_transactions').select('*').eq('id', recordId).single();
        data = res.data; error = res.error;
      } else {
        const res = await supabase.from('tmb_transactions').select('*').eq('id', recordId).single();
        data = res.data; error = res.error;
      }

      if (error || !data) {
        toast.error('Erro ao carregar detalhes da transação');
        return;
      }

      setSelectedPlatform(platform);
      if (platform === 'hotmart') setSelectedHotmart(data as unknown as Transaction);
      else if (platform === 'eduzz') setSelectedEduzz(data as unknown as EduzzTransaction);
      else setSelectedTmb(data as unknown as TmbTransaction);
      setDetailOpen(true);
    } catch {
      toast.error('Erro ao carregar detalhes');
    }
  };

  const closeDetail = (open: boolean) => {
    if (!open) {
      setDetailOpen(false);
      setSelectedPlatform(null);
      setSelectedHotmart(null);
      setSelectedEduzz(null);
      setSelectedTmb(null);
    }
  };

  const platformLabel = (p: string) =>
    p === 'hotmart' ? 'Hotmart' : p === 'tmb' ? 'TMB' : 'Eduzz';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buscar Duplicata</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Form */}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1.5 block">ID da transação ou E-mail</label>
                <Input
                  placeholder="Ex: 2012342 ou email@exemplo.com"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Plataforma</label>
                <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="hotmart">Hotmart</SelectItem>
                    <SelectItem value="tmb">TMB</SelectItem>
                    <SelectItem value="eduzz">Eduzz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar
              </Button>
            </div>

            {/* Results */}
            {hasSearched && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {results.length} resultado(s) encontrado(s)
                </p>

                {results.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado para "{searchTerm}"
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plataforma</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((r) => (
                          <TableRow
                            key={`${r.platform}-${r.id}`}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(r.id, r.platform)}
                          >
                            <TableCell>
                              <Badge variant="outline">{platformLabel(r.platform)}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.transactionId}</TableCell>
                            <TableCell className="text-sm max-w-[180px] truncate">{r.email ?? '—'}</TableCell>
                            <TableCell className="text-sm max-w-[150px] truncate">{r.buyer_name ?? '—'}</TableCell>
                            <TableCell className="text-sm max-w-[150px] truncate">{r.product ?? '—'}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(r.value)}</TableCell>
                            <TableCell className="text-sm">
                              {r.date ? formatDateTimeBR(r.date, 'dd/MM/yyyy HH:mm:ss') : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.source === 'webhook' ? 'default' : 'secondary'}>
                                {r.source === 'webhook' ? 'Webhook' : r.source ?? 'CSV'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <HotmartTransactionDetailDialog
        transaction={selectedHotmart}
        open={detailOpen && selectedPlatform === 'hotmart'}
        onOpenChange={closeDetail}
      />
      <EduzzTransactionDetailDialog
        transaction={selectedEduzz}
        open={detailOpen && selectedPlatform === 'eduzz'}
        onOpenChange={closeDetail}
      />
      <TmbTransactionDetailDialog
        transaction={selectedTmb}
        open={detailOpen && selectedPlatform === 'tmb'}
        onOpenChange={closeDetail}
      />
    </>
  );
}
