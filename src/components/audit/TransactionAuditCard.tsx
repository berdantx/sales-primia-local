import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertTriangle, RefreshCw, Search, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactionAudit, TransactionAuditResult } from "@/hooks/useTransactionAudit";
import { formatCurrency } from "@/lib/calculations/goalCalculations";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/ui/alert-dialog";

export function TransactionAuditCard() {
  const { data, isLoading, refetch, isFetching } = useTransactionAudit();
  const [search, setSearch] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState({ current: 0, total: 0 });

  const filteredResults = data?.results.filter(r => 
    r.transaction_code.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const incorretos = filteredResults.filter(r => r.status === 'INCORRETO');
  const corretos = filteredResults.filter(r => r.status === 'OK');

  const allIncorretos = data?.results.filter(r => r.status === 'INCORRETO') || [];

  const handleBulkFix = async () => {
    if (allIncorretos.length === 0) return;

    setIsFixing(true);
    setFixProgress({ current: 0, total: allIncorretos.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allIncorretos.length; i++) {
      const tx = allIncorretos[i];
      
      try {
        const { error } = await supabase
          .from('transactions')
          .update({
            computed_value: tx.valor_correto_sem_impostos,
            projected_value: tx.valor_correto_sem_impostos,
            gross_value_with_taxes: tx.valor_com_impostos,
          })
          .eq('transaction_code', tx.transaction_code);

        if (error) {
          console.error(`Erro ao corrigir ${tx.transaction_code}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Erro ao corrigir ${tx.transaction_code}:`, err);
        errorCount++;
      }

      setFixProgress({ current: i + 1, total: allIncorretos.length });
    }

    setIsFixing(false);

    if (errorCount === 0) {
      toast.success(`✅ ${successCount} transações corrigidas com sucesso!`);
    } else {
      toast.warning(`⚠️ ${successCount} corrigidas, ${errorCount} com erro`);
    }

    // Refresh the audit data
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando auditoria...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Auditoria de Valores - Webhook
          </CardTitle>
          <div className="flex items-center gap-2">
            {allIncorretos.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={isFixing}
                  >
                    {isFixing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wrench className="h-4 w-4 mr-2" />
                    )}
                    Corrigir Todos ({allIncorretos.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Correção em Massa</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        Esta ação irá corrigir <strong>{allIncorretos.length} transações</strong> incorretas,
                        atualizando o <code className="bg-muted px-1 rounded">computed_value</code> para o valor 
                        sem impostos (<code className="bg-muted px-1 rounded">price.value</code>) do payload original.
                      </p>
                      <p className="text-amber-600 dark:text-amber-500">
                        Diferença total a ser corrigida: {formatCurrency(data?.summary.diferencaTotal || 0, 'BRL')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Esta operação não pode ser desfeita automaticamente.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkFix}>
                      Confirmar Correção
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching || isFixing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Compara computed_value salvo vs price.value do payload (sem impostos)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar during fix */}
        {isFixing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Corrigindo transações...</span>
              <span className="font-medium">
                {fixProgress.current} / {fixProgress.total}
              </span>
            </div>
            <Progress value={(fixProgress.current / fixProgress.total) * 100} />
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-2xl font-bold">{data?.summary.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-2xl font-bold text-green-600">{data?.summary.corretos || 0}</div>
            <div className="text-xs text-muted-foreground">Corretos</div>
          </div>
          <div className={`p-3 rounded-lg text-center ${data?.summary.incorretos ? 'bg-red-500/10' : 'bg-muted/50'}`}>
            <div className={`text-2xl font-bold ${data?.summary.incorretos ? 'text-red-600' : ''}`}>
              {data?.summary.incorretos || 0}
            </div>
            <div className="text-xs text-muted-foreground">Incorretos</div>
          </div>
        </div>

        {data?.summary.incorretos ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-200 dark:border-red-900">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  Diferença total: {formatCurrency(data.summary.diferencaTotal, 'BRL')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">
                Todas as transações estão com valores corretos!
              </span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código da transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Results List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {incorretos.length > 0 && (
              <>
                <div className="text-sm font-medium text-red-600 flex items-center gap-1.5 py-1">
                  <AlertTriangle className="h-4 w-4" />
                  Transações Incorretas ({incorretos.length})
                </div>
                {incorretos.map((result) => (
                  <AuditResultRow key={result.transaction_code} result={result} />
                ))}
              </>
            )}

            {corretos.length > 0 && (
              <>
                <div className="text-sm font-medium text-green-600 flex items-center gap-1.5 py-1 mt-4">
                  <CheckCircle className="h-4 w-4" />
                  Transações Corretas ({corretos.length})
                </div>
                {corretos.slice(0, 20).map((result) => (
                  <AuditResultRow key={result.transaction_code} result={result} />
                ))}
                {corretos.length > 20 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    ... e mais {corretos.length - 20} transações corretas
                  </div>
                )}
              </>
            )}

            {filteredResults.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AuditResultRow({ result }: { result: TransactionAuditResult }) {
  const isIncorrect = result.status === 'INCORRETO';

  return (
    <div className={`p-3 rounded-lg border ${isIncorrect ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' : 'border-border bg-muted/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <code className="text-sm font-mono">{result.transaction_code}</code>
        <Badge variant={isIncorrect ? "destructive" : "secondary"}>
          {result.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Salvo:</span>{" "}
          <span className={isIncorrect ? 'text-red-600 font-medium' : ''}>
            {formatCurrency(result.valor_salvo, 'BRL')}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Correto:</span>{" "}
          <span className="text-green-600 font-medium">
            {formatCurrency(result.valor_correto_sem_impostos, 'BRL')}
          </span>
        </div>
        <div className="col-span-2 text-xs text-muted-foreground">
          {result.billing_type} | Com impostos: {formatCurrency(result.valor_com_impostos, 'BRL')}
        </div>
        {isIncorrect && (
          <div className="col-span-2 text-xs text-red-600">
            Diferença: {formatCurrency(Math.abs(result.diferenca), 'BRL')}
          </div>
        )}
      </div>
    </div>
  );
}
