

# Corrigir Modal de Leads - Criar RPC Leve para Evitar Timeout

## Problema Confirmado

A RPC `get_lead_stats` esta dando **timeout** (erro 57014) ao tentar varrer 136k+ leads sem filtro de data. O modal nao carrega porque depende dessa RPC pesada.

## Solucao (3 passos)

### 1. Criar RPC leve no banco: `get_lead_summary_stats`

Nova funcao PostgreSQL que faz **uma unica varredura** retornando apenas:
- `total`: contagem total de leads
- `by_traffic_type`: contagem por tipo de trafego (paid, organic, direct)

```sql
CREATE OR REPLACE FUNCTION get_lead_summary_stats(
  p_client_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
) RETURNS jsonb AS $$
  -- single pass: COUNT + GROUP BY traffic_type
  -- usa indice idx_leads_client_date_range
$$
```

### 2. Novo hook: `src/hooks/useLeadSummaryStats.ts`

Hook dedicado que chama `get_lead_summary_stats` em vez de `get_lead_stats`. Retorna `{ total, byTrafficType }`.

### 3. Atualizar `src/components/leads/LeadsSummaryDialog.tsx`

- Trocar `useLeadStatsOptimized` por `useLeadSummaryStats`
- Manter `DateRangePicker` e `useTopAdsByConversion` sem alteracao

## Arquivos

- **Migration SQL**: criar funcao `get_lead_summary_stats`
- **Novo**: `src/hooks/useLeadSummaryStats.ts`
- **Editado**: `src/components/leads/LeadsSummaryDialog.tsx` (trocar o hook)

