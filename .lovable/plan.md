
# Filtro de Data no Modal de Resumo de Leads

## Problema Atual

O modal de resumo usa os dados filtrados pela pagina (ultimos 30 dias por padrao). O usuario quer que o modal tenha seu proprio filtro de data, com padrao "todo o periodo" (sem restricao de datas).

## Solucao

Adicionar um `DateRangePicker` dentro do `LeadsSummaryDialog` com estado local proprio. Por padrao, o range fica `undefined` (todo o periodo). O dialog passa a buscar seus proprios dados internamente em vez de receber via props.

## Detalhes Tecnicos

### 1. Refatorar `LeadsSummaryDialog.tsx`

- Adicionar estado local `dateRange` (default: `undefined` = todo periodo)
- Importar e renderizar o `DateRangePicker` abaixo do titulo
- Mover as chamadas de dados para dentro do componente:
  - `useLeadStatsOptimized({ clientId, startDate, endDate })` para dados de trafego
  - `useTopAdsByConversion({ clientId, startDate, endDate, limit: 5 })` para top 5 anuncios
- Atualizar o titulo para mostrar o periodo selecionado ou "Todo o Periodo"

Props simplificadas:
- `open`, `onOpenChange`, `clientId`, `clientName`

### 2. Atualizar `Leads.tsx`

- Remover as props `stats`, `topConversionAds`, `isLoadingAds` do componente
- Remover o hook `useTopAdsByConversion` que era usado exclusivamente para o modal
- Passar apenas `clientId` e `clientName` para o dialog

### Arquivos alterados

- `src/components/leads/LeadsSummaryDialog.tsx` — refatorar para buscar dados internamente + adicionar DateRangePicker
- `src/pages/Leads.tsx` — simplificar props passadas ao dialog
