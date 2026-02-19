
# Plano de Implementacao: 4 Funcionalidades do Dashboard e Upload

## Resumo

Sao 5 itens solicitados. O item 3 (exportar schema do banco com backup) ja esta implementado no sistema atual. Os 4 restantes serao desenvolvidos conforme abaixo.

---

## 1. KPI de Vendas por Produto com Drill-Down por Pais e Moeda

### O que muda
Adicionar um novo card no dashboard que mostra os Top 5 produtos com a possibilidade de expandir cada produto e ver o detalhamento por pais e moeda.

### Abordagem
- Criar componente `ProductCategoryDrilldown` que recebe as transacoes unificadas
- Agrupar por `product`, depois permitir drill-down por `country` (disponivel na tabela `transactions` da Hotmart) e `currency`
- Usar um Accordion ou Collapsible para expandir cada produto e ver a distribuicao
- Exibir totais em BRL e USD separadamente dentro do drill-down
- Posicionar abaixo do `DashboardSalesAnalytics` existente

### Arquivos
- Criar: `src/components/dashboard/ProductDrilldownCard.tsx`
- Editar: `src/pages/Dashboard.tsx` (adicionar o novo componente)
- Editar: `src/hooks/useCombinedTransactions.ts` (adicionar campo `country` ao `UnifiedTransaction`)

---

## 2. Toggle de Conversao de Moeda com Taxas ao Vivo (BRL/USD)

### O que muda
O toggle existente (`CurrencyViewToggle`) tem 3 opcoes (combinado, apenas BRL, separado). Sera expandido para permitir escolher a moeda base de exibicao: ver todos os valores convertidos para BRL ou todos convertidos para USD.

### Abordagem
- Adicionar uma opcao "Tudo em USD" ao `CurrencyViewToggle` que converte BRL para USD usando a cotacao inversa
- O hook `useDollarRate` ja fornece a taxa ao vivo (AwesomeAPI/BCB)
- Os cards KPI e graficos passarao a respeitar a moeda base selecionada
- Quando "Tudo em USD" estiver ativo, valores BRL serao divididos pela taxa do dolar
- Quando "Combinado" (padrao), USD sera convertido para BRL como ja funciona

### Arquivos
- Editar: `src/components/dashboard/CurrencyViewToggle.tsx` (adicionar opcao `usd-only`)
- Editar: `src/pages/Dashboard.tsx` (aplicar conversao nos KPIs quando `usd-only`)
- Editar: `src/components/dashboard/ColoredDashboardCards.tsx` (respeitar moeda base)

---

## 3. Exportar Schema do Banco com Backup EM JSON

**Ja implementado.** O sistema possui:
- Edge Function `export-schema` que chama a RPC `get_database_schema()`
- Hook `useClientSideBackup` com parametro `includeSchema`
- Checkbox "Incluir estrutura do banco" no BackupDashboard
- O JSON final inclui tabelas, colunas, indexes, RLS policies, funcoes e triggers

Nenhuma acao necessaria.

---

## 4. Atualizacao em Tempo Real do Ranking de Top Clientes

### O que muda
Apos um upload de planilha, o ranking de Top 10 Clientes no dashboard sera atualizado automaticamente via Supabase Realtime, sem precisar recarregar a pagina.

### Abordagem
- As tabelas `transactions`, `eduzz_transactions` e `tmb_transactions` ja estao no Realtime (conforme memoria do sistema)
- Adicionar um listener `postgres_changes` no hook `useTransactionStatsOptimized` (e equivalentes TMB/Eduzz) para invalidar o cache do React Query quando houver insercoes
- Quando uma insercao e detectada, chamar `queryClient.invalidateQueries` para os top customers
- Isso faz o `TopCustomers` re-renderizar automaticamente com os dados atualizados

### Arquivos
- Editar: `src/hooks/useTransactionStatsOptimized.ts` (adicionar canal Realtime para invalidacao)
- Editar: `src/hooks/useTmbTransactionStatsOptimized.ts` (mesmo padrao)
- Editar: `src/hooks/useEduzzTransactionStatsOptimized.ts` (mesmo padrao)

---

## 5. Mapeamento Manual de Colunas no Upload

### O que muda
Adicionar uma etapa intermediaria entre o upload do arquivo e o preview. O sistema detecta automaticamente as colunas (comportamento atual), mas exibe uma tela onde o usuario pode corrigir o mapeamento antes de prosseguir.

### Abordagem
- Criar componente `ColumnMappingStep` que:
  - Mostra as colunas detectadas no arquivo (headers do CSV/XLSX)
  - Para cada campo esperado (ex: "Codigo da Transacao", "Produto", "Email"), mostra um Select com as colunas do arquivo
  - Pre-seleciona baseado na deteccao automatica existente
  - Campos obrigatorios sao marcados com asterisco
  - Validacao: nao permite prosseguir se campos obrigatorios nao estiverem mapeados
- Adicionar novo step `mapping` no fluxo do Upload (entre `upload` e `preview`)
- Refatorar os parsers para aceitar um `columnMap` customizado ao inves de sempre auto-detectar
- Manter compatibilidade: se o mapeamento automatico encontrou tudo, os campos ja vem pre-preenchidos

### Experiencia do usuario
1. Seleciona plataforma
2. Faz upload do arquivo
3. **NOVO**: Ve a tela de mapeamento com colunas pre-detectadas
4. Ajusta se necessario e confirma
5. Ve o preview (como hoje)
6. Confirma importacao

### Arquivos
- Criar: `src/components/upload/ColumnMappingStep.tsx`
- Editar: `src/pages/Upload.tsx` (adicionar step `mapping` no fluxo)
- Editar: `src/lib/parsers/hotmartParser.ts` (aceitar columnMap externo)
- Editar: `src/lib/parsers/tmbParser.ts` (mesmo padrao)
- Editar: `src/lib/parsers/eduzzParser.ts` (mesmo padrao)

---

## Detalhes Tecnicos

### Migracao de Banco
Nenhuma migracao necessaria. Todos os campos utilizados ja existem nas tabelas.

### Componentes novos
1. `src/components/dashboard/ProductDrilldownCard.tsx` -- Card com drill-down por produto/pais/moeda
2. `src/components/upload/ColumnMappingStep.tsx` -- Interface de mapeamento de colunas

### Ordem de implementacao
1. Toggle de moeda USD (menor impacto, aproveita infraestrutura existente)
2. KPI de produtos com drill-down (novo componente independente)
3. Realtime para top customers (mudanca pontual nos hooks)
4. Mapeamento manual de colunas (maior complexidade, refatoracao dos parsers)
