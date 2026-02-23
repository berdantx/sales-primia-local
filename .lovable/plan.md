
# Corrigir Porcentagem no Modal de Resumo de Leads

## Problema

A RPC `get_lead_summary_stats` tem um bug no calculo do total. O `COUNT(*)` na query externa conta o **numero de linhas do subquery** (ou seja, o numero de grupos de trafego = 3), em vez da soma real dos leads.

Resultado: `total = 3`, e a porcentagem e calculada como `46725 / 3 * 100 = 1557500%`.

## Solucao

Corrigir a query para usar `SUM(cnt)` em vez de `COUNT(*)` na query externa:

```sql
SELECT
  COALESCE(SUM(cnt), 0)::bigint,   -- era COUNT(*)
  COALESCE(jsonb_object_agg(tt, cnt) FILTER (WHERE tt IS NOT NULL), '{}'::jsonb)
INTO v_total, v_by_traffic
FROM (
  SELECT
    COALESCE(l.traffic_type, 'direct') AS tt,
    COUNT(*) AS cnt
  FROM leads l
  WHERE ...
  GROUP BY COALESCE(l.traffic_type, 'direct')
) sub;
```

## Detalhes Tecnicos

### Migration SQL

Recriar a funcao `get_lead_summary_stats` com `SUM(cnt)` no lugar de `COUNT(*)`.

### Arquivos

- **Nova migration SQL**: corrigir a funcao `get_lead_summary_stats` (trocar `COUNT(*)` por `SUM(cnt)`)
- Nenhuma alteracao em arquivos frontend (o calculo de porcentagem no componente esta correto)
