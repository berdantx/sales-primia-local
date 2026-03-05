
## Plano: Exibir dados CIS PAY no painel principal

O problema é que o `Dashboard.tsx` não inclui CIS PAY nos cálculos de receita nem no gráfico de distribuição por plataforma. Existem 3 pontos a corrigir:

### 1. Dashboard.tsx — Incluir cispayStats na receita

- **Linha 65**: Adicionar `cispayStats` na destructuring de `useCombinedStats`
- **Linhas 80-89**: Adicionar `cispayBRL` na soma de `confirmed` e `projected`, e retorná-lo no objeto `revenue`
- **Linha 89**: Incluir `cispayBRL` no return do useMemo

### 2. Dashboard.tsx — PlatformSharePieChart

- **Linha 397**: Adicionar condição `revenue.cispayBRL > 0`
- **Linha 398-402**: Passar `cispayTotal={revenue.cispayBRL}` ao componente

### 3. PlatformSharePieChart — Aceitar CIS PAY

- Adicionar `cispayTotal` na interface de props
- Adicionar `{ name: 'CIS PAY', value: cispayTotal }` ao array `data`
- Incluir `cispayTotal` no cálculo de `total`
- Adicionar cor `'CIS PAY': 'hsl(30, 50%, 50%)'` no objeto COLORS

### Resultado esperado

As 6 transações CIS PAY (BRL 210.000) do cliente BVAZ Educação aparecerão nos KPIs de receita, no gráfico de evolução (via `salesByDate` que já funciona no `useCombinedStats`) e no gráfico de pizza de plataformas.
