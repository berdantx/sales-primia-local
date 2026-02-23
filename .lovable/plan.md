
# Carregar Leads de Todo o Periodo no Modal de Resumo

## Problema

A RPC `get_lead_stats` faz **12 varreduras separadas** na tabela `leads` (136k registros), causando **timeout** quando nao ha filtro de data. O modal de resumo so precisa de `total` e `by_traffic_type`, mas esta chamando a RPC pesada completa.

## Solucao

1. Criar uma nova RPC leve (`get_lead_summary_stats`) que retorna apenas o total e a distribuicao por tipo de trafego em uma unica varredura
2. Criar um hook dedicado (`useLeadSummaryStats`) para o modal
3. Atualizar o `LeadsSummaryDialog` para usar o hook leve em vez do pesado

## Detalhes Tecnicos

### 1. Nova RPC: `get_lead_summary_stats` (Migration SQL)

Uma funcao otimizada que faz **uma unica varredura** na tabela, retornando apenas:
- `total`: contagem total de leads
- `by_traffic_type`: contagem agrupada por tipo de trafego (paid, organic, direct)

Aproveita o indice existente `idx_leads_client_date_range (client_id, created_at)`.

### 2. Novo hook: `src/hooks/useLeadSummaryStats.ts`

Hook leve que chama a RPC `get_lead_summary_stats` e retorna `{ total, byTrafficType }`. Usado exclusivamente pelo modal de resumo.

### 3. Atualizar `src/components/leads/LeadsSummaryDialog.tsx`

- Substituir `useLeadStatsOptimized` por `useLeadSummaryStats` (mais leve)
- Manter o `DateRangePicker` e o filtro opcional
- Manter `useTopAdsByConversion` para a secao de top 5 anuncios

### Arquivos

- **Nova migration**: Criar RPC `get_lead_summary_stats`
- **Novo**: `src/hooks/useLeadSummaryStats.ts`
- **Editado**: `src/components/leads/LeadsSummaryDialog.tsx` (trocar hook)
