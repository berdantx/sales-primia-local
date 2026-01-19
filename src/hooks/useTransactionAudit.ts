import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TransactionAuditResult {
  transaction_code: string;
  valor_salvo: number;
  valor_correto_sem_impostos: number;
  valor_com_impostos: number;
  billing_type: string;
  status: 'OK' | 'INCORRETO';
  diferenca: number;
  webhook_created_at: string;
}

export interface AuditSummary {
  total: number;
  corretos: number;
  incorretos: number;
  diferencaTotal: number;
}

export function useTransactionAudit() {
  return useQuery({
    queryKey: ['transaction-audit'],
    queryFn: async () => {
      // Buscar logs de webhook com payloads
      const { data: webhookLogs, error: logsError } = await supabase
        .from('webhook_logs')
        .select('transaction_code, payload, created_at')
        .eq('status', 'processed')
        .not('transaction_code', 'is', null);

      if (logsError) throw logsError;

      // Buscar transações de webhook
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('transaction_code, computed_value, projected_value, gross_value_with_taxes, billing_type')
        .eq('source', 'webhook');

      if (txError) throw txError;

      // Criar mapa de transações
      const txMap = new Map(transactions?.map(t => [t.transaction_code, t]) || []);

      // Processar auditoria
      const auditResults: TransactionAuditResult[] = [];

      for (const log of webhookLogs || []) {
        const tx = txMap.get(log.transaction_code);
        if (!tx) continue;

        const payload = log.payload as any;
        const priceValue = payload?.purchase?.price?.value || 
                          payload?.purchase?.original_offer_price?.value || 
                          0;
        const fullPriceValue = payload?.purchase?.full_price?.value || 0;

        if (!priceValue) continue;

        const diferenca = Math.abs(tx.computed_value - priceValue);
        const status = diferenca > 0.1 ? 'INCORRETO' : 'OK';

        auditResults.push({
          transaction_code: tx.transaction_code,
          valor_salvo: tx.computed_value,
          valor_correto_sem_impostos: priceValue,
          valor_com_impostos: fullPriceValue,
          billing_type: tx.billing_type || '',
          status,
          diferenca: tx.computed_value - priceValue,
          webhook_created_at: log.created_at,
        });
      }

      // Ordenar: incorretos primeiro, depois por data
      auditResults.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'INCORRETO' ? -1 : 1;
        }
        return new Date(b.webhook_created_at).getTime() - new Date(a.webhook_created_at).getTime();
      });

      // Calcular resumo
      const summary: AuditSummary = {
        total: auditResults.length,
        corretos: auditResults.filter(r => r.status === 'OK').length,
        incorretos: auditResults.filter(r => r.status === 'INCORRETO').length,
        diferencaTotal: auditResults
          .filter(r => r.status === 'INCORRETO')
          .reduce((sum, r) => sum + Math.abs(r.diferenca), 0),
      };

      return { results: auditResults, summary };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
