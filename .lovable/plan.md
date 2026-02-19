

# Pagina de Cancelamentos Eduzz

## O que sera criado
Uma nova pagina "Cancelamentos Eduzz" com duas abas:
1. **Cancelamentos Automaticos** - transacoes com status "cancelado" (vindas do webhook)
2. **Exclusoes Manuais** - registros da tabela `eduzz_transaction_deletion_logs` (exclusoes feitas por usuarios com justificativa)

## Estrutura

A pagina segue o mesmo padrao visual da pagina "Cancelamentos TMB" ja existente, adaptada para Eduzz.

### Aba "Cancelamentos Automaticos"
- Lista transacoes da tabela `eduzz_transactions` filtradas por `status = 'cancelado'`
- KPIs: Total cancelado, quantidade, taxa de cancelamento
- Filtros: periodo, busca por texto
- Tabela com: ID venda, produto, cliente, valor, data venda, data cancelamento
- Exportar CSV

### Aba "Exclusoes Manuais"
- Lista registros da tabela `eduzz_transaction_deletion_logs`
- Mostra: dados da transacao original (do campo JSONB `transaction_data`), quem excluiu, quando, e o **motivo da exclusao**
- Busca por produto, cliente ou ID
- Badge destacando a justificativa

## Arquivos a criar/modificar

### 1. Criar: `src/hooks/useEduzzDeletionLogs.ts`
- Hook que busca registros de `eduzz_transaction_deletion_logs` filtrados por `client_id`
- Aceita filtros de periodo e busca textual
- Faz join com `profiles` para trazer o nome de quem excluiu (via `deleted_by`)

### 2. Criar: `src/pages/EduzzCancellations.tsx`
- Pagina com duas abas usando componente `Tabs`
- Aba 1: reutiliza `useEduzzTransactions` filtrando por `status === 'cancelado'` (mesmo padrao do TmbCancellations)
- Aba 2: usa o novo hook `useEduzzDeletionLogs`
- Header com `ClientContextHeader`
- KPIs com `ColoredKPICard`
- Tabela paginada, busca com debounce, exportar CSV

### 3. Modificar: `src/components/layout/AppSidebar.tsx`
- Adicionar item "Cancelamentos Eduzz" no grupo "Vendas", abaixo de "Eduzz"
- Icone: `Ban` (mesmo dos cancelamentos TMB)
- Rota: `/eduzz-cancellations`
- Roles: `['master', 'admin', 'user']`

### 4. Modificar: `src/App.tsx`
- Adicionar rota `/eduzz-cancellations` apontando para o novo componente

### Nenhuma migracao necessaria
A tabela `eduzz_transaction_deletion_logs` ja existe e possui as RLS policies corretas (somente master pode inserir e visualizar).

