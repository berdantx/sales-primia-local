

## Problema

Ao acessar `/leads`, o `dateRange` é inicializado com os últimos 30 dias (`subDays(new Date(), 30)`). Isso faz com que tanto o `totalCount` (vindo do RPC `get_leads_paginated`) quanto as estatísticas do IAQL reflitam apenas esse período restrito — mostrando poucos leads em vez do total real do cliente (50k+).

## Solução

Alterar o estado inicial de `dateRange` e `selectedPeriod` em `src/pages/Leads.tsx` para carregar **todos os leads** por padrão:

1. Mudar `selectedPeriod` de `'30days'` para `'all'`
2. Mudar `dateRange` de `{ from: subDays(new Date(), 30), to: new Date() }` para `undefined`

Isso fará com que os filtros de data sejam `null` nas chamadas RPC, retornando todos os registros. O componente `LeadsCompactFilters` já deve suportar o período "all" — verificarei e ajustarei se necessário.

## Verificação necessária

Confirmar que `LeadsCompactFilters` e o `LeadsPeriodFilter` tratam corretamente o valor `'all'` para `selectedPeriod` e `undefined` para `dateRange`.

