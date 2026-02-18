

# Processar Cancelamentos e Chargebacks da Eduzz

## Problema
O webhook da Eduzz atualmente so processa vendas aprovadas. Eventos de cancelamento (`myeduzz.invoice_canceled`) e chargeback (`myeduzz.invoice_chargeback`) sao ignorados com status "skipped". Isso impede que transacoes canceladas sejam subtraidas do faturamento.

## O que sera implementado

### 1. Migracao de banco de dados
Adicionar duas colunas na tabela `eduzz_transactions` (igual ao padrao ja usado em `tmb_transactions`):
- `status` (text, default `'paid'`) -- para diferenciar vendas ativas de canceladas
- `cancelled_at` (timestamp with time zone, nullable) -- data do cancelamento

### 2. Atualizar o webhook Eduzz
Modificar `supabase/functions/eduzz-webhook/index.ts` para:
- Detectar o tipo de evento via campo `event` do payload (ex: `myeduzz.invoice_chargeback`, `myeduzz.invoice_canceled`)
- Quando for cancelamento/chargeback:
  - Buscar a transacao existente pelo `sale_id` (ou ID equivalente no payload)
  - Se encontrada: atualizar `status = 'cancelado'` e `cancelled_at = now()`
  - Se nao encontrada: inserir como nova transacao ja com status `cancelado`
  - Logar no `webhook_logs` com event_type `EDUZZ_SALE_CANCELED` ou `EDUZZ_SALE_CHARGEBACK`
- Manter o fluxo atual para vendas aprovadas (inserir com `status = 'paid'`)

### 3. Ajustar queries de dashboard/KPIs
Filtrar transacoes Eduzz para excluir `status = 'cancelado'` nas consultas de faturamento, garantindo que cancelamentos nao sejam contados como receita.

## Detalhes Tecnicos

### Migracao SQL
```text
ALTER TABLE eduzz_transactions 
  ADD COLUMN status text NOT NULL DEFAULT 'paid',
  ADD COLUMN cancelled_at timestamptz;
```

### Arquivo modificado
- `supabase/functions/eduzz-webhook/index.ts`
  - Extrair campo `event` do payload raiz (ex: `body.event`)
  - Adicionar lista de eventos de cancelamento: `['myeduzz.invoice_chargeback', 'myeduzz.invoice_canceled']`
  - Nova branch de logica: se evento e cancelamento, buscar transacao existente e atualizar status
  - Transacoes aprovadas continuam sendo inseridas com `status: 'paid'`

### Hooks/paginas que podem precisar de ajuste
- `src/hooks/useEduzzTransactions.ts` -- adicionar filtro `.neq('status', 'cancelado')` ou exibir status
- `src/hooks/useEduzzTransactionStatsOptimized.ts` -- excluir cancelados dos KPIs
- `src/hooks/useCombinedStats.ts` / `src/hooks/useCombinedTransactions.ts` -- excluir cancelados

### Fluxo do webhook atualizado

1. Recebe POST
2. Verifica ping -- responde 200
3. Extrai `event` e `sale_id` do payload
4. Se evento e cancelamento/chargeback:
   - Busca transacao por `sale_id` + `client_id`
   - Atualiza ou insere com `status: 'cancelado'`
   - Loga em `webhook_logs`
5. Se evento e venda aprovada:
   - Fluxo atual (upsert com `status: 'paid'`)
6. Qualquer outro evento: skip + log

### Aguardando
Os payloads de teste que voce vai enviar serao analisados nos logs para confirmar a estrutura exata dos campos (onde vem o `event`, o `sale_id`, o valor, etc.) antes de finalizar a implementacao.
