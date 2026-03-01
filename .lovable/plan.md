

# Plano: Nova Dashboard Executiva Premium

## Visão Geral

Recriar a Dashboard principal (`/`) seguindo fielmente a estrutura da imagem de referência: layout premium Apple enterprise, hierarquia clara, máximo 4 KPIs + 2 gráficos, bloco de top produtos, e sidebar reestruturada com a navegação fornecida.

## Tarefas

### 1. Reestruturar AppSidebar com navegação fornecida

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Substituir a estrutura `menuGroups` atual pela navegação exata fornecida (CORE, OPERACAO, ADMIN)
- Ícones: `LayoutDashboard`, `TrendingUp`, `BarChart3`, `Target`, `Wallet`, `FileUp`, `Ban`, `Activity`, `Users`, `Database`, `Link2`, `ShieldCheck`
- Footer fixo: Configurações (`Settings`), Minha Conta (`User`), Sair (`LogOut`)
- Bloco superior: logo + nome do sistema + nome do cliente (via `ClientIndicator` ou `useClients`)
- Visual: badges discretos para grupos (CORE em azul suave, OP cinza, ADMIN vermelho discreto), espaçamento generoso, hover suave, item ativo com borda lateral azul sutil
- Mapeamento de roles: `produtor` → `master`, `coprodutor` → `user`, `admin` → `admin` (manter compatibilidade com `useUserRole`)
- Rotas mantidas: `/transactions` → "Vendas", `/leads` → dentro de "Análise", etc. (sem mudar rotas reais, só labels e agrupamento)

### 2. Simplificar Header

**Arquivo:** `src/components/layout/Header.tsx`

- Remover botões de ação (Histórico, Metas, Importar) — tudo está no sidebar agora
- Manter: SidebarTrigger, logo (menor), separador, e no canto direito: badges de filtro inline (Plataforma, Moeda, USD rate, "Atualizado há X min")
- Layout limpo, uma linha, sem dropdown mobile de ações

### 3. Recriar Dashboard.tsx

**Arquivo:** `src/pages/Dashboard.tsx` (rewrite completo)

Estrutura de blocos na ordem exata da imagem:

**A) Header da página**
- Título grande: "Visão Geral do Lançamento"
- Subtítulo: "O que importa agora: caixa, previsibilidade e direção de decisão."
- Canto direito: "Status do dia" com último evento

**B) 4 KPIs grandes (primeira dobra)**
Novo componente `ExecutiveKPICard` (sem fundo colorido forte, estilo clean):
1. **Receita Confirmada** — badge "Caixa", valor grande, subtexto "Vendas pagas/efetivadas"
2. **Receita Projetada** — badge "Previsão", valor grande, subtexto "Inclui parcelas futuras e recorrência"
3. **Meta do Período** — percentual em badge, valor grande, subtexto "Faltam R$ X", barra de progresso fina
4. **Leads no Período** — badge "Aquisição", valor grande, subtexto "Com UTMs e origem"

Dados: reutilizar `useCombinedStats`, `useProjectionStats`, `useActiveGoals`, `useLeadCount`, `useDollarRate` — mesma lógica atual

**C) Bloco "Evolução Essencial" (2/3 largura)**
- Gráfico principal: "Evolução de Receita (Confirmada vs Projetada)" — `LineChart` do Recharts, últimos 30 dias
- Gráfico secundário: "Participação por Plataforma" — `PieChart` simplificado (Hotmart + TMB + Eduzz)
- Dados: `salesByDate` do `useCombinedStats` + pie chart com totais por plataforma

**D) Bloco "Direção do Que Fazer Agora" (1/3 largura, ao lado)**
Novo componente `StrategicRecommendationCard`:
- Card com fundo `bg-blue-50 border-blue-100`
- Título "Recomendação Estratégica (IA)"
- Conteúdo estático/template por enquanto (placeholder inteligente baseado nos dados)
- 3 tags: Prioridade, Base temporal, Impacto estimado
- Lista de alertas com pontos coloridos (amarelo/vermelho/verde) e ação sugerida

**E) Bloco "O Que Está Puxando o Resultado" (2/3 largura)**
Reutilizar dados do `ProductDrilldownCard` mas com layout minimal novo:
- Lista dos top 3-5 produtos
- Nome à esquerda, receita à direita, vendas abaixo
- Badge "Top 5"

**F) Bloco "Coprodução" (1/3 largura, ao lado)**
Resumo do `CoproducerEarningsCard` — visão produtor vs coprodutor, link para detalhamento

### 4. Criar novos componentes

**Novos arquivos:**
- `src/components/dashboard/ExecutiveKPICard.tsx` — Card KPI clean (sem fundo colorido, sombra leve, badge discreto, número grande `text-3xl font-bold`, label `text-sm text-muted-foreground`)
- `src/components/dashboard/StrategicRecommendationCard.tsx` — Card de recomendação IA com alertas
- `src/components/dashboard/TopProductsList.tsx` — Lista minimal de top produtos
- `src/components/dashboard/CoproductionSummaryCard.tsx` — Resumo coprodução

### 5. Diretrizes visuais aplicadas

- Cards: `bg-card border border-border shadow-sm rounded-[16px]`
- KPIs: número `text-3xl font-bold`, label `text-sm text-muted-foreground`
- Badges: `variant="outline"` ou custom com cores suaves (não chamativos)
- Espaçamento: `space-y-6` entre seções, `gap-6` em grids
- Barra de progresso da meta: `h-2 rounded-full bg-muted` com fill `bg-primary`
- Fundo geral: `bg-background` (#F7FAFC)
- Sem framer-motion pesado (apenas fade-in sutil)
- Sem gradientes nos cards KPI
- Border radius: `rounded-2xl` (16px) nos cards principais

### 6. Compatibilidade

- Manter todas as rotas existentes funcionando (não alterar `App.tsx`)
- Manter todos os hooks de dados existentes
- Sidebar: mapear roles `produtor`/`coprodutor`/`admin` para os roles existentes (`master`/`user`/`admin`)
- Mobile: sidebar continua como drawer (Sheet), conteúdo 100% largura
- Manter `canViewFinancials` para restrição de dados financeiros
- Manter empty state quando não há dados

