import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Filter, RefreshCw } from 'lucide-react';
import { useDuplicateAudit, useResolveDuplicate, DuplicateGroup, useEmailDuplicateAudit, useResolveEmailDuplicate, EmailDuplicateGroup, Platform } from '@/hooks/useDuplicateAudit';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { HotmartTransactionDetailDialog } from '@/components/hotmart/HotmartTransactionDetailDialog';
import { EduzzTransactionDetailDialog } from '@/components/eduzz/EduzzTransactionDetailDialog';
import { TmbTransactionDetailDialog } from '@/components/tmb/TmbTransactionDetailDialog';
import type { Transaction } from '@/hooks/useTransactions';
import type { EduzzTransaction } from '@/hooks/useEduzzTransactions';
import type { TmbTransaction } from '@/hooks/useTmbTransactions';
import { toast } from 'sonner';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
}

function platformLabel(p: string) {
  return p === 'hotmart' ? 'Hotmart' : p === 'tmb' ? 'TMB' : 'Eduzz';
}

// ============ ID TAB (existing) ============

function IdDuplicatesTab() {
  const { data, isLoading } = useDuplicateAudit();
  const resolve = useResolveDuplicate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const resolveGroup = (group: DuplicateGroup, keep: 'webhook' | 'csv') => {
    const idsToDelete = group.records
      .filter(r => keep === 'webhook' ? r.source !== 'webhook' : r.source === 'webhook')
      .map(r => r.id);
    if (idsToDelete.length === 0) return;
    resolve.mutate({ platform: group.platform, idsToDelete });
  };

  const batchResolve = (keep: 'webhook' | 'csv') => {
    if (!data) return;
    for (const group of data.duplicates) {
      const key = `${group.platform}_${group.identifier}_${group.clientId}`;
      if (!selected.has(key)) continue;
      resolveGroup(group, keep);
    }
    setSelected(new Set());
  };

  const summary = data?.summary;
  const duplicates = data?.duplicates ?? [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-20" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Hotmart</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary?.hotmart ?? 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">TMB</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary?.tmb ?? 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Eduzz</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary?.eduzz ?? 0}</p></CardContent>
            </Card>
            <Card className="border-destructive/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Valor Inflado</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(summary?.totalInflated ?? 0)}</p></CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Batch Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selected.size} grupo(s) selecionado(s)</span>
          <Button size="sm" variant="outline" onClick={() => batchResolve('webhook')} disabled={resolve.isPending}>
            Manter Webhook (lote)
          </Button>
          <Button size="sm" variant="outline" onClick={() => batchResolve('csv')} disabled={resolve.isPending}>
            Manter CSV (lote)
          </Button>
        </div>
      )}

      {/* Duplicates Table */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : duplicates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold">Nenhuma duplicata encontrada</h3>
            <p className="text-muted-foreground">Todas as transações estão íntegras.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group) => {
            const key = `${group.platform}_${group.identifier}_${group.clientId}`;
            const hasWebhook = group.records.some(r => r.source === 'webhook');
            const hasCsv = group.records.some(r => r.source !== 'webhook');

            return (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selected.has(key)} onCheckedChange={() => toggleSelect(key)} />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="outline">{platformLabel(group.platform)}</Badge>
                          <span className="font-mono text-sm">{group.identifier}</span>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.records.length} registros · Inflado: <span className="text-destructive font-medium">{formatCurrency(group.inflatedValue)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {hasWebhook && hasCsv && (
                        <>
                          <Button size="sm" variant="default" onClick={() => resolveGroup(group, 'webhook')} disabled={resolve.isPending}>
                            Manter Webhook
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => resolveGroup(group, 'csv')} disabled={resolve.isPending}>
                            Manter CSV
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.records.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>
                            <Badge variant={rec.source === 'webhook' ? 'default' : 'secondary'}>
                              {rec.source === 'webhook' ? 'Webhook' : 'CSV'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{rec.email ?? '—'}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{rec.product ?? '—'}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(rec.value)}</TableCell>
                          <TableCell className="text-sm">{formatDate(rec.date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ EMAIL TAB (new) ============

function EmailDuplicatesTab() {
  const { data, isLoading } = useEmailDuplicateAudit();
  const resolve = useResolveEmailDuplicate();
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [hideInstallments, setHideInstallments] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Map<string, Set<string>>>(new Map());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedHotmart, setSelectedHotmart] = useState<Transaction | null>(null);
  const [selectedEduzz, setSelectedEduzz] = useState<EduzzTransaction | null>(null);
  const [selectedTmb, setSelectedTmb] = useState<TmbTransaction | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const toggleRecordForDeletion = (groupKey: string, recordId: string) => {
    setSelectedIds(prev => {
      const next = new Map(prev);
      const groupSet = new Set(next.get(groupKey) ?? []);
      if (groupSet.has(recordId)) groupSet.delete(recordId);
      else groupSet.add(recordId);
      if (groupSet.size === 0) next.delete(groupKey);
      else next.set(groupKey, groupSet);
      return next;
    });
  };

  const resolveKeepNewest = (group: EmailDuplicateGroup) => {
    const sorted = [...group.records].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
    const toDelete = sorted.slice(1); // keep first (newest)
    if (toDelete.length === 0) return;

    const byPlatform = new Map<Platform, string[]>();
    for (const r of toDelete) {
      const ids = byPlatform.get(r.platform) ?? [];
      ids.push(r.id);
      byPlatform.set(r.platform, ids);
    }
    resolve.mutate(Array.from(byPlatform.entries()).map(([platform, ids]) => ({ platform, ids })));
  };

  const resolveKeepSource = (group: EmailDuplicateGroup, keepSource: 'webhook' | 'csv') => {
    const toDelete = group.records.filter(r =>
      keepSource === 'webhook' ? r.source !== 'webhook' : r.source === 'webhook'
    );
    if (toDelete.length === 0) return;

    const byPlatform = new Map<Platform, string[]>();
    for (const r of toDelete) {
      const ids = byPlatform.get(r.platform) ?? [];
      ids.push(r.id);
      byPlatform.set(r.platform, ids);
    }
    resolve.mutate(Array.from(byPlatform.entries()).map(([platform, ids]) => ({ platform, ids })));
  };

  const resolveSelected = (groupKey: string, group: EmailDuplicateGroup) => {
    const idsToDelete = selectedIds.get(groupKey);
    if (!idsToDelete || idsToDelete.size === 0) return;

    const byPlatform = new Map<Platform, string[]>();
    for (const rec of group.records) {
      if (!idsToDelete.has(rec.id)) continue;
      const ids = byPlatform.get(rec.platform) ?? [];
      ids.push(rec.id);
      byPlatform.set(rec.platform, ids);
    }
    resolve.mutate(Array.from(byPlatform.entries()).map(([platform, ids]) => ({ platform, ids })));
    setSelectedIds(prev => { const n = new Map(prev); n.delete(groupKey); return n; });
  };

  let duplicates = data?.duplicates ?? [];
  const summary = data?.summary;

  // Apply filters
  if (platformFilter !== 'all') {
    duplicates = duplicates.filter(g => g.platform === platformFilter);
  }
  if (hideInstallments) {
    duplicates = duplicates.filter(g => !g.isProbablyInstallments);
  }

  const handleRowClick = async (recordId: string, platform: Platform) => {
    setLoadingDetail(true);
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
    } finally {
      setLoadingDetail(false);
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-20" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Hotmart</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary?.hotmart ?? 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">TMB</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary?.tmb ?? 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Eduzz</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary?.eduzz ?? 0}</p></CardContent>
            </Card>
            <Card className="border-destructive/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Valor Inflado</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(summary?.totalInflated ?? 0)}</p></CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="hotmart">Hotmart</SelectItem>
              <SelectItem value="tmb">TMB</SelectItem>
              <SelectItem value="eduzz">Eduzz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="hide-installments" checked={hideInstallments} onCheckedChange={setHideInstallments} />
          <Label htmlFor="hide-installments" className="text-sm">Ocultar parcelas (Hotmart)</Label>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {duplicates.length} grupo(s) encontrado(s)
        </span>
      </div>

      {/* Groups */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : duplicates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold">Nenhuma duplicata por email encontrada</h3>
            <p className="text-muted-foreground">Todas as transações estão íntegras.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group) => {
            const key = `${group.platform}_${group.email}_${group.product}_${group.clientId}`;
            const hasWebhook = group.records.some(r => r.source === 'webhook');
            const hasCsv = group.records.some(r => r.source !== 'webhook');
            const groupSelectedIds = selectedIds.get(key);

            return (
              <Card key={key} className={group.isProbablyInstallments ? 'border-amber-500/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{platformLabel(group.platform)}</Badge>
                        <span className="text-sm">{group.email}</span>
                        {group.isProbablyInstallments && (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                            <RefreshCw className="h-3 w-3 mr-1" /> Provável parcela
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.product ?? '—'} · {group.records.length} registros · Total: {formatCurrency(group.totalValue)} · Inflado: <span className="text-destructive font-medium">{formatCurrency(group.inflatedValue)}</span>
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => resolveKeepNewest(group)} disabled={resolve.isPending}>
                        Manter mais recente
                      </Button>
                      {hasWebhook && hasCsv && (
                        <>
                          <Button size="sm" variant="default" onClick={() => resolveKeepSource(group, 'webhook')} disabled={resolve.isPending}>
                            Manter Webhook
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => resolveKeepSource(group, 'csv')} disabled={resolve.isPending}>
                            Manter CSV
                          </Button>
                        </>
                      )}
                      {groupSelectedIds && groupSelectedIds.size > 0 && (
                        <Button size="sm" variant="destructive" onClick={() => resolveSelected(key, group)} disabled={resolve.isPending}>
                          Remover {groupSelectedIds.size} selecionado(s)
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.records.map((rec) => (
                        <TableRow key={rec.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(rec.id, rec.platform)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={groupSelectedIds?.has(rec.id) ?? false}
                              onCheckedChange={() => toggleRecordForDeletion(key, rec.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate">{rec.transactionId}</TableCell>
                          <TableCell>
                            <Badge variant={rec.source === 'webhook' ? 'default' : 'secondary'}>
                              {rec.source === 'webhook' ? 'Webhook' : rec.source ?? 'CSV'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{rec.status || '—'}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(rec.value)}</TableCell>
                          <TableCell className="text-sm">{formatDate(rec.date)}</TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">{rec.buyer_name ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
}

// ============ MAIN PAGE ============

export default function DuplicateAudit() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Duplicatas</h1>
          <p className="text-muted-foreground">Identifique e resolva vendas duplicadas entre CSV e webhook.</p>
        </div>

        <Tabs defaultValue="by-id">
          <TabsList>
            <TabsTrigger value="by-id">Por ID</TabsTrigger>
            <TabsTrigger value="by-email">Por Email</TabsTrigger>
          </TabsList>
          <TabsContent value="by-id">
            <IdDuplicatesTab />
          </TabsContent>
          <TabsContent value="by-email">
            <EmailDuplicatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
