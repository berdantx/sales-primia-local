
# Corrigir Top 5 do Modal de Leads - Mostrar por Volume

## Problema

O modal de resumo usa a RPC `get_top_ads_by_conversion` que ranqueia por leads convertidos. Isso faz anuncios como "teste" (1 lead, 1 conversao = 100%) aparecerem no topo. O usuario quer ver os anuncios que **trouxeram mais leads** (por volume), como mostrado no card principal da pagina.

## Solucao

Trocar o hook `useTopAdsByConversion` por `useTopAdsOptimized` (que ja existe e chama a RPC `get_top_ads`), e ajustar o componente para exibir os dados no formato correto.

## Alteracoes

### Arquivo: `src/components/leads/LeadsSummaryDialog.tsx`

1. Trocar o import de `useTopAdsByConversion` por `useTopAdsOptimized`
2. Atualizar a chamada do hook para usar os parametros de `useTopAdsOptimized`
3. Ajustar o template para exibir `count` e `percentage` em vez de `convertedLeads` e `conversionRate`
4. Atualizar o titulo da secao de "Anuncios que mais convertem" para "Anuncios que mais trouxeram leads"
5. Remover o icone `TrendingUp` e os campos de conversao que nao se aplicam mais

### Detalhes tecnicos

O hook `useTopAdsOptimized` retorna:
```typescript
interface TopAdItem {
  name: string;
  count: number;       // total de leads
  percentage: number;  // % do total
  firstLeadDate: string | null;
  isNew: boolean;
}
```

A RPC `get_top_ads` ja ordena por volume (`count DESC`) e ja esta otimizada com indices existentes, sem risco de timeout.

Nenhuma alteracao no banco de dados e necessaria.
