import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, Trash2, AlertTriangle } from 'lucide-react';
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
import { useQueryClient } from '@tanstack/react-query';

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

interface DuplicateGroupResult {
  key: string;
  label: string;
  records: SearchResult[];
  isDuplicate: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function platformLabel(p: string) {
  return p === 'hotmart' ? 'Hotmart' : p === 'tmb' ? 'TMB' : 'Eduzz';
}

/** Group results by transaction ID to highlight duplicates */
function groupResults(results: SearchResult[]): DuplicateGroupResult[] {
  // Group by transactionId (across platforms too)
  const byId = new Map<string, SearchResult[]>();
  for (const r of results) {
    const key = r.transactionId.toLowerCase();
    const group = byId.get(key) ?? [];
    group.push(r);
    byId.set(key, group);
  }

  // Also group by email+product to catch cross-platform duplicates
  const byEmail = new Map<string, SearchResult[]>();
  for (const r of results) {
    if (!r.email) continue;
    const key = `${r.email.toLowerCase()}|${(r.product ?? '').toLowerCase()}`;
    const group = byEmail.get(key) ?? [];
    group.push(r);
    byEmail.set(key, group);
  }

  // Merge: collect all records that share an ID or email+product with duplicates
  const duplicateIds = new Set<string>();
  for (const group of byId.values()) {
    if (group.length > 1) group.forEach(r => duplicateIds.add(r.id));
  }
  for (const group of byEmail.values()) {
    if (group.length > 1) group.forEach(r => duplicateIds.add(r.id));
  }

  // Build grouped output: duplicates first, then singles
  const groups: DuplicateGroupResult[] = [];
  const usedIds = new Set<string>();

  // ID-based duplicate groups
  for (const [key, records] of byId.entries()) {
    if (records.length <= 1) continue;
    groups.push({
      key: `id_${key}`,
      label: `ID: ${records[0].transactionId}`,
      records,
      isDuplicate: true,
    });
    records.forEach(r => usedIds.add(r.id));
  }

  // Email-based duplicate groups (only records not already grouped by ID)
  for (const [key, records] of byEmail.entries()) {
    if (records.length <= 1) continue;
    const remaining = records.filter(r => !usedIds.has(r.id));
    if (remaining.length <= 1) continue;
    const [email] = key.split('|');
    groups.push({
      key: `email_${key}`,
      label: `Email: ${email}`,
      records: remaining,
      isDuplicate: true,
    });
    remaining.forEach(r => usedIds.add(r.id));
  }

  // Non-duplicate records
  const singles = results.filter(r => !usedIds.has(r.id));
  if (singles.length > 0) {
    groups.push({
      key: 'singles',
      label: 'Sem duplicatas detectadas',
      records: singles,
      isDuplicate: false,
    });
  }

  return groups;
}

interface SearchDuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDuplicateDialog({ open, onOpenChange }: SearchDuplicateDialogProps) {
  const { clientId } = useFilter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedHotmart, setSelectedHotmart] = useState<Transaction | null>(null);
  const [selectedEduzz, setSelectedEduzz] = useState<EduzzTransaction | null>(null);
  const [selectedTmb, setSelectedTmb] = useState<TmbTransaction | null>(null);

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) {
      toast.error('Digite um ID, e-mail ou nome para buscar');
      return;
    }
    if (!clientId) {
      toast.error('Selecione um cliente primeiro');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSelectedForDeletion(new Set());
    const allResults: SearchResult[] = [];

    try {
      const searchPlatforms = platformFilter === 'all' ? ['hotmart', 'tmb', 'eduzz'] : [platformFilter];

      if (searchPlatforms.includes('hotmart')) {
        const { data } = await supabase
          .from('transactions')
          .select('id, transaction_code, buyer_email, buyer_name, computed_value, purchase_date, source, product')
          .eq('client_id', clientId)
          .or(`transaction_code.ilike.%${term}%,buyer_email.ilike.%${term}%,buyer_name.ilike.%${term}%,product.ilike.%${term}%`)
          .limit(100);

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

      if (searchPlatforms.includes('tmb')) {
        const { data } = await supabase
          .from('tmb_transactions')
          .select('id, order_id, buyer_email, buyer_name, ticket_value, effective_date, source, product')
          .eq('client_id', clientId)
          .or(`order_id.ilike.%${term}%,buyer_email.ilike.%${term}%,buyer_name.ilike.%${term}%,product.ilike.%${term}%`)
          .limit(100);

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

      if (searchPlatforms.includes('eduzz')) {
        const { data } = await supabase
          .from('eduzz_transactions')
          .select('id, sale_id, buyer_email, buyer_name, sale_value, sale_date, source, product')
          .eq('client_id', clientId)
          .or(`sale_id.ilike.%${term}%,buyer_email.ilike.%${term}%,buyer_name.ilike.%${term}%,product.ilike.%${term}%`)
          .limit(100);

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

  const toggleSelect = (id: string) => {
    setSelectedForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteRecord = async (record: SearchResult) => {
    const table = record.platform === 'hotmart' ? 'transactions'
      : record.platform === 'tmb' ? 'tmb_transactions'
      : 'eduzz_transactions';

    const { error } = await supabase.from(table).delete().eq('id', record.id);
    if (error) {
      toast.error(`Erro ao remover: ${error.message}`);
      return false;
    }
    return true;
  };

  const handleDeleteSingle = async (record: SearchResult) => {
    if (!confirm(`Remover esta transação ${record.transactionId} (${platformLabel(record.platform)})?`)) return;

    setIsDeleting(true);
    const ok = await deleteRecord(record);
    if (ok) {
      setResults(prev => prev.filter(r => r.id !== record.id));
      setSelectedForDeletion(prev => { const n = new Set(prev); n.delete(record.id); return n; });
      toast.success('Transação removida com sucesso');
      queryClient.invalidateQueries({ queryKey: ['duplicate-audit'] });
      queryClient.invalidateQueries({ queryKey: ['email-duplicate-audit'] });
    }
    setIsDeleting(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedForDeletion.size === 0) return;
    if (!confirm(`Remover ${selectedForDeletion.size} transação(ões) selecionada(s)?`)) return;

    setIsDeleting(true);
    let successCount = 0;
    const toDelete = results.filter(r => selectedForDeletion.has(r.id));

    for (const record of toDelete) {
      const ok = await deleteRecord(record);
      if (ok) successCount++;
    }

    if (successCount > 0) {
      setResults(prev => prev.filter(r => !selectedForDeletion.has(r.id)));
      setSelectedForDeletion(new Set());
      toast.success(`${successCount} transação(ões) removida(s)`);
      queryClient.invalidateQueries({ queryKey: ['duplicate-audit'] });
      queryClient.invalidateQueries({ queryKey: ['email-duplicate-audit'] });
    }
    setIsDeleting(false);
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

  const closeDetail = (openState: boolean) => {
    if (!openState) {
      setDetailOpen(false);
      setSelectedPlatform(null);
      setSelectedHotmart(null);
      setSelectedEduzz(null);
      setSelectedTmb(null);
    }
  };

  const groups = groupResults(results);
  const duplicateCount = groups.filter(g => g.isDuplicate).reduce((sum, g) => sum + g.records.length, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buscar Duplicata</DialogTitle>
            <DialogDescription>
              Busque por ID, e-mail, nome ou produto para encontrar transações duplicadas no cliente selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Form */}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1.5 block">Buscar por</label>
                <Input
                  placeholder="ID, e-mail, nome ou produto..."
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

            {/* Batch delete bar */}
            {selectedForDeletion.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedForDeletion.size} selecionado(s)</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Remover selecionados
                </Button>
              </div>
            )}

            {/* Results */}
            {hasSearched && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {results.length} resultado(s) encontrado(s)
                  </p>
                  {duplicateCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {duplicateCount} em duplicidade
                    </Badge>
                  )}
                </div>

                {results.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado para "{searchTerm}"
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      {group.isDuplicate && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-semibold text-destructive">
                            Duplicata detectada — {group.label}
                          </span>
                          <Badge variant="outline">{group.records.length} registros</Badge>
                        </div>
                      )}
                      {!group.isDuplicate && groups.length > 1 && (
                        <p className="text-sm text-muted-foreground font-medium">{group.label}</p>
                      )}
                      <div className={`border rounded-md overflow-hidden ${group.isDuplicate ? 'border-destructive/40' : ''}`}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8"></TableHead>
                              <TableHead>Plataforma</TableHead>
                              <TableHead>ID</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Origem</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.records.map((r) => (
                              <TableRow
                                key={`${r.platform}-${r.id}`}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleRowClick(r.id, r.platform)}
                              >
                                <TableCell onClick={e => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedForDeletion.has(r.id)}
                                    onCheckedChange={() => toggleSelect(r.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{platformLabel(r.platform)}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.transactionId}</TableCell>
                                <TableCell className="text-sm max-w-[180px] truncate">{r.email ?? '—'}</TableCell>
                                <TableCell className="text-sm max-w-[130px] truncate">{r.buyer_name ?? '—'}</TableCell>
                                <TableCell className="text-sm max-w-[130px] truncate">{r.product ?? '—'}</TableCell>
                                <TableCell className="font-medium">{formatCurrency(r.value)}</TableCell>
                                <TableCell className="text-sm">
                                  {r.date ? formatDateTimeBR(r.date, 'dd/MM/yyyy HH:mm:ss') : '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={r.source === 'webhook' ? 'default' : 'secondary'}>
                                    {r.source === 'webhook' ? 'Webhook' : r.source ?? 'CSV'}
                                  </Badge>
                                </TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteSingle(r)}
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))
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
