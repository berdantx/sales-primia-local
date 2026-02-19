
# Plano de Implementacao: 4 Funcionalidades do Dashboard e Upload

## Status: ✅ CONCLUÍDO

---

## 1. ✅ KPI de Vendas por Produto com Drill-Down por Pais e Moeda
- Criado `ProductDrilldownCard.tsx` com Accordion para Top 5 produtos
- Campo `country` adicionado ao `UnifiedTransaction`
- Drill-down mostra breakdown por país e moeda (BRL/USD separados)

## 2. ✅ Toggle de Conversao de Moeda com Taxas ao Vivo (BRL/USD)
- Adicionada opção "Tudo em USD" ao `CurrencyViewToggle`
- 4 modos: Combinado, Apenas BRL, Tudo em USD, Separado

## 3. ✅ Exportar Schema do Banco com Backup (já implementado anteriormente)

## 4. ✅ Atualizacao em Tempo Real do Ranking de Top Clientes
- Realtime listeners adicionados em `useTransactionStatsOptimized`, `useTmbTransactionStatsOptimized` e `useEduzzTransactionStatsOptimized`
- Cache do React Query invalidado automaticamente em INSERTs

## 5. ✅ Mapeamento Manual de Colunas no Upload
- Criado `ColumnMappingStep.tsx` com interface completa
- Parsers refatorados para aceitar `columnMap` customizado
- Funções `autoDetect*Columns` exportadas para cada plataforma
- Novo step "mapping" no fluxo de upload entre upload e preview
