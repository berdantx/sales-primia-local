
# Plano: Vendas Canceladas TMB

## Resumo
Atualmente, o webhook TMB ignora todos os eventos com status diferente de "Efetivado" (incluindo 52 cancelamentos registrados nos logs). Este plano implementa o processamento de cancelamentos e cria um relatorio dedicado.

## O que muda

### 1. Banco de dados
- Adicionar coluna `status` na tabela `tmb_transactions` (valores: `efetivado`, `cancelado`; default: `efetivado`)
- Adicionar coluna `cancelled_at` (timestamp de quando foi cancelado)
- Atualizar os registros existentes que ja possuem cancelamento nos webhook_logs (os 52 pedidos ja registrados)
- Atualizar a RPC `get_tmb_transaction_stats` para separar faturamento efetivado vs cancelado
- Criar indice em `tmb_transactions(status)` para filtros rapidos

### 2. Webhook TMB (edge function)
- Aceitar status "Cancelado" alem de "Efetivado"
- Quando receber "Cancelado": buscar a transacao existente pelo `order_id` e atualizar `status = 'cancelado'` e `cancelled_at = now()`
- Se a transacao cancelada nao existir no banco, inserir com `status = 'cancelado'` e `ticket_value` do payload

### 3. Frontend - Pagina de Transacoes TMB
- Adicionar badge visual de status (verde para efetivado, vermelho para cancelado) em cada linha da tabela
- Adicionar filtro de status (Todos / Efetivado / Cancelado)
- KPI cards atualizados para mostrar tambem o valor cancelado
- Novo KPI card "Cancelamentos" mostrando quantidade e valor total cancelado

### 4. Frontend - Nova pagina de Relatorio de Cancelamentos
- Criar pagina `/tmb-cancellations` com listagem dedicada de vendas canceladas
- Mostrar KPIs: total cancelado, quantidade, taxa de cancelamento (cancelados / total)
- Tabela com: pedido, produto, cliente, valor, data da venda, data do cancelamento
- Filtros de periodo e produto
- Exportacao CSV
- Adicionar link no menu lateral (sidebar) dentro do grupo "Vendas"

## Detalhes Tecnicos

### Migracao SQL
```sql
-- Adicionar colunas
ALTER TABLE tmb_transactions 
  ADD COLUMN status text NOT NULL DEFAULT 'efetivado',
  ADD COLUMN cancelled_at timestamptz;

-- Indice
CREATE INDEX idx_tmb_status ON tmb_transactions(status);

-- Backfill: marcar como canceladas as transacoes que tem TMB_ORDER_CANCELADO no webhook_logs
UPDATE tmb_transactions t
SET status = 'cancelado', cancelled_at = wl.created_at
FROM (
  SELECT DISTINCT ON (transaction_code) transaction_code, created_at
  FROM webhook_logs
  WHERE event_type = 'TMB_ORDER_CANCELADO'
  ORDER BY transaction_code, created_at DESC
) wl
WHERE t.order_id = wl.transaction_code;
```

### Webhook (tmb-webhook/index.ts)
- Mudar a condicao de `statusPedido !== "Efetivado"` para aceitar tambem `"Cancelado"`
- Para cancelamentos: fazer UPDATE na transacao existente, ou INSERT com status cancelado se nao existir

### Arquivos a criar
- `src/pages/TmbCancellations.tsx` - pagina do relatorio de cancelamentos

### Arquivos a editar
- `supabase/functions/tmb-webhook/index.ts` - aceitar cancelamentos
- `src/hooks/useTmbTransactions.ts` - adicionar campo `status` e `cancelled_at` na interface
- `src/hooks/useTmbTransactionStatsOptimized.ts` - incluir stats de cancelamento
- `src/pages/TmbTransactions.tsx` - badge de status, filtro, KPI de cancelamentos
- `src/components/layout/AppSidebar.tsx` - link para nova pagina
- `src/App.tsx` - rota `/tmb-cancellations`
