

# Correção da Exibição de Anúncios nas Páginas de Leads e Vendas

## Problema Identificado

Após análise detalhada do código e banco de dados, identifiquei **dois problemas principais**:

### 1. Páginas de Vendas (TmbTransactions e Transactions)

**TmbTransactions**: O componente `TopSalesCard` não está configurado com `showAds={true}`, portanto o toggle de "Anúncios" não aparece na interface, mesmo existindo dados de `utm_content` na tabela.

**Transactions (Hotmart)**: A tabela `transactions` **não possui colunas UTM** (`utm_content`, `utm_campaign`, etc.), então não é possível exibir anúncios para esta plataforma. Esta é uma limitação de dados, não um bug.

### 2. Página de Leads - Gráfico de Evolução

O gráfico `AdTrendChart` usa `paginatedData?.leads` que contém apenas 50 leads (uma página). Isso faz com que o gráfico de evolução mostre dados incompletos ou vazios, pois os leads paginados podem não incluir dados dos top items.

Além disso, o hook `useAdTrend` não suporta o modo 'pages' corretamente - ele só processa 'ads' e 'campaigns'.

---

## Plano de Correção

### Arquivo 1: `src/pages/TmbTransactions.tsx`

**Alteração:** Adicionar prop `showAds={true}` ao `TopSalesCard`

```text
Linha ~467-474: Adicionar showAds={true} nas props do TopSalesCard
```

Antes:
```tsx
<TopSalesCard
  topItems={topItems}
  totalCount={totalTopCount}
  mode={topMode}
  onModeChange={(mode) => { setTopMode(mode); setSelectedTopItem(null); }}
  selectedItem={selectedTopItem}
  onItemClick={(name) => setSelectedTopItem(prev => prev === name ? null : name)}
/>
```

Depois:
```tsx
<TopSalesCard
  topItems={topItems}
  totalCount={totalTopCount}
  mode={topMode}
  onModeChange={(mode) => { setTopMode(mode); setSelectedTopItem(null); }}
  selectedItem={selectedTopItem}
  onItemClick={(name) => setSelectedTopItem(prev => prev === name ? null : name)}
  showAds={true}
/>
```

---

### Arquivo 2: `src/hooks/useAdTrend.ts`

**Alteração:** Adicionar suporte ao modo 'pages' para processar corretamente o campo `page_url`

```text
Linhas 31-40: Expandir lógica para incluir modo 'pages'
```

Antes:
```typescript
const field = mode === 'ads' ? 'utm_content' : 'utm_campaign';
```

Depois:
```typescript
const getFieldValue = (lead: Lead): string | null => {
  if (mode === 'ads') return lead.utm_content;
  if (mode === 'campaigns') return lead.utm_campaign;
  if (mode === 'pages') {
    // Normalizar URL removendo protocolo e query strings
    if (!lead.page_url) return null;
    return lead.page_url
      .replace(/^https?:\/\//, '')
      .replace(/\?.*$/, '');
  }
  return lead.utm_content;
};
```

---

### Arquivo 3: `src/pages/Leads.tsx` (Melhoria do Gráfico de Evolução)

**Problema:** O gráfico de evolução usa leads paginados (50 por página), resultando em dados incompletos.

**Solução:** Criar uma chamada separada para buscar leads completos apenas para o gráfico de evolução, ou utilizar os dados agregados do RPC.

**Opção A - Usar dados do stats (mais eficiente):**
O hook `useLeadStatsOptimized` já retorna dados agregados por dia (`stats?.byDay`). Podemos criar um novo RPC `get_ad_trend` que retorna a evolução dos top items sem precisar carregar todos os leads.

**Opção B - Carregar leads sem paginação apenas para o gráfico (mais simples):**
Adicionar uma query separada que busca todos os leads do período apenas quando a aba "evolution" está ativa.

**Recomendação:** Opção A é mais performática para grandes volumes de dados.

---

## Nota sobre Transactions (Hotmart)

A tabela `transactions` (Hotmart) não possui campos UTM. Para adicionar suporte a anúncios nesta plataforma, seria necessário:

1. Adicionar colunas `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` à tabela
2. Atualizar o parser de importação para extrair esses dados
3. Atualizar o webhook para capturar UTMs

Esta é uma mudança maior que pode ser implementada separadamente se necessário.

---

## Resumo das Alterações

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/pages/TmbTransactions.tsx` | Fix | Habilitar toggle de Anúncios |
| `src/hooks/useAdTrend.ts` | Fix | Suportar modo 'pages' |
| `src/pages/Leads.tsx` | Melhoria | Corrigir gráfico de evolução |

---

## Resultado Esperado

- Toggle "Anúncios" visível na página TMB
- Gráfico de evolução de páginas funcionando corretamente
- Dados completos no gráfico de evolução (não limitados à página atual)

