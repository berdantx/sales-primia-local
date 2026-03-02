

# Plano: Refinamento Final da Dashboard Executiva Premium

## O que já está implementado
A Dashboard, KPIs, gráficos e sidebar já foram criados nas iterações anteriores. Os componentes `ExecutiveKPICard`, `StrategicRecommendationCard`, `TopProductsList`, `RevenueEvolutionChart` já existem e estão funcionais.

## O que precisa ser ajustado

### 1. Sidebar — Grupos colapsáveis Vendas e Análise dentro de CORE
**Arquivo:** `src/components/layout/AppSidebar.tsx`

A sidebar atual tem Vendas e Análise como links diretos. O prompt exige que sejam **sub-grupos colapsáveis** dentro de CORE:

```text
CORE
  Painel          → /
  ▸ Vendas        (colapsável)
      Hotmart     → /transactions
      TMB         → /tmb-transactions
      Eduzz       → /eduzz-transactions
      Internacional → /international-sales
      Comparativo → /comparative
  ▸ Análise       (colapsável)
      Leads       → /leads
      Funil       → /leads/funnel

OPERAÇÃO
  Metas           → /goals
  Coprodução      → /coproduction
  Importar Dados  → /upload
  Cancel. TMB     → /tmb-cancellations
  Cancel. Eduzz   → /eduzz-cancellations

ADMIN
  Equipe          → /users
  Clientes        → /clients
  Integrações     → /webhook-config
  Auditoria       → /duplicate-audit
```

- Usar `Collapsible` do Radix para cada sub-grupo
- `defaultOpen` baseado em rota ativa dentro do sub-grupo
- Itens internos indentados com `pl-9`
- Badges discretos nos labels de grupo (CORE azul, OP cinza, ADM vermelho suave)
- Adicionar ícones `Globe`, `GitCompare`, `Layers` de lucide-react para novos itens
- Footer: Configurações + email/role do usuário + botão Sair (já existe, apenas adicionar label de role "Master"/"Admin"/"Cliente")

### 2. PlatformSharePieChart — Estilo executivo clean
**Arquivo:** `src/components/dashboard/PlatformSharePieChart.tsx`

- Remover wrapper `motion.div` e `Card`/`CardHeader`/`CardContent`
- Usar estilo consistente: `bg-card border border-border rounded-2xl shadow-sm`
- Adicionar ícone `Layers` no header (como os outros blocos)
- Badge "Distribuição" no canto superior direito
- Border-radius do tooltip: `12px`

### 3. Nenhuma mudança no Dashboard.tsx
O `Dashboard.tsx` já implementa corretamente a estrutura do plano: 4 KPIs, gráfico de evolução, recomendação IA, top produtos, pie chart, e coprodução. Não precisa de alteração.

### 4. Nenhuma mudança no App.tsx
Todas as rotas existentes são mantidas. A sidebar apenas reorganiza a navegação visualmente.

