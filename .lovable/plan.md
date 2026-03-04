

## Diagnóstico

Analisei o fluxo completo: RPCs, hooks, componentes de filtro e exportação. A infraestrutura técnica já existe e funciona — as RPCs `get_leads_paginated`, `count_leads_for_export` e `export_leads_batch` todas suportam `p_traffic_type`. O banco tem 17.718 leads orgânicos, 118.039 pagos e 584 diretos.

**Problema identificado**: Quando o usuário abre o dialog de exportação, todos os filtros são resetados (linhas 93-109 do `ClientSideExportDialog`). Existe um botão "Usar filtros da página" mas ele é pouco visível e não é aplicado automaticamente. Isso faz parecer que não é possível exportar com os filtros ativos.

Há também um problema de UX: os KPIs e contagens nos filtros não refletem o filtro de tráfego aplicado, pois `statsFilters` só inclui cliente e período — não inclui traffic type, UTMs, etc.

## Plano

### 1. Auto-aplicar filtros da página ao abrir o dialog de exportação

No `ClientSideExportDialog`, quando o dialog abrir e houver `activeFilters` com valores, aplicar automaticamente esses filtros em vez de resetar tudo. Remover a necessidade de clicar em "Usar filtros da página".

**Arquivo**: `src/components/leads/ClientSideExportDialog.tsx`
- No `useEffect` de `open`, se `activeFilters` tiver valores, pré-preencher os estados internos do dialog
- Manter o botão "Usar filtros da página" como fallback caso o usuário limpe e queira reaplicar

### 2. Melhorar velocidade de carregamento — usar `get_lead_stats_cached`

O hook `useLeadStatsOptimized` ainda chama `get_lead_stats` diretamente. Atualizar para usar `get_lead_stats_cached` (criada na migration anterior) quando não há filtro de período, aproveitando a Materialized View.

**Arquivo**: `src/hooks/useLeadStatsOptimized.ts`
- Chamar `get_lead_stats_cached` em vez de `get_lead_stats` quando `startDate` e `endDate` forem null

### 3. Atualizar stats com filtros de tráfego (opcional mas recomendado)

Passar os filtros ativos (traffic type, source, etc.) para a query de stats, para que KPIs e contagens reflitam a visão filtrada.

**Arquivo**: `src/pages/Leads.tsx`
- Expandir `statsFilters` para incluir os filtros ativos da página
**Arquivo**: RPC `get_lead_stats` — adicionar parâmetros opcionais de filtro

---

### Resumo de arquivos afetados
- `src/components/leads/ClientSideExportDialog.tsx` — auto-aplicar filtros ao abrir
- `src/hooks/useLeadStatsOptimized.ts` — usar RPC cached
- `src/pages/Leads.tsx` — expandir statsFilters (se aprovar item 3)
- Migration SQL — adicionar filtros à `get_lead_stats` (se aprovar item 3)

