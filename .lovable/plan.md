Fechou, berdan. Eu **não alterei nada do plano do Lovable** antes, eu tinha só comentado e guiado a direção.  
Agora, como você pediu: tá aqui o **PROMPT COMPLETO**, já pronto pra você colar no Lovable, com **títulos refinados** e as instruções bem objetivas pra ele executar sem inventar moda.

---

## ✅ PROMPT PARA O LOVABLE (colar direto)

Quero aplicar um refinamento visual “Bloomberg / institucional” na dashboard atual, **sem mudar a estrutura, sem trocar componentes de lugar e sem redesign criativo**.  
É um upgrade de percepção: de “SaaS bom” para “Centro de Inteligência Operacional Premium”.

**Mantenha:**

- layout geral, hierarquia e grid
- light mode
- shadcn/ui + Tailwind
- estética clean tipo Apple enterprise
- sem gradiente pesado, sem cor forte, sem sombras exageradas

**Objetivo:** elevar percepção de software high ticket, com clareza e decisões em 30s.

---

# 1) Control Bar (Topo) — Status Global Institucional

**Arquivo:** `DashboardControlBar.tsx`

Reformule o badge de status (zona direita) para um bloco institucional com hierarquia vertical:

- **Linha 1:** Label em destaque (ex: **“Risco Moderado”**) com dot colorido + ring sutil
- **Linha 2:** “87% do ritmo” em destaque (`text-sm font-bold`)
- **Linha 3:** “16% do período decorrido” em muted (`text-xs text-muted-foreground`)

**Visual:**

- fundo tonal MUITO sutil baseado no status:
  - OK: `emerald-50/60`
  - Atenção: `amber-50/60`
  - Crítico: `red-50/60`
- borda correspondente (bem sutil): `border-emerald-200/60` etc
- aumentar padding e espaçamento interno (sensação de bloco institucional)
- separar visualmente título/subtítulo dos filtros com mais respiro (gap vertical maior)

**Títulos recomendados no topo (manter pt-br):**

- Título: **“Centro de Comando”**
- Subtítulo: **“Infraestrutura estratégica para decisões de alto impacto.”**

---

# 2) Sidebar — Minimalismo Premium (Linear/Notion)

**Arquivo:** `AppSidebar.tsx`

Aplicar padrão minimal premium:

- item ativo: **remover fundo highlight**, usar só **barra lateral esquerda fina** (2px sólida `primary`) sem bg
- reduzir peso dos ícones (Lucide): `strokeWidth 1.75 → 1.5`
- aumentar espaçamento vertical: `h-9 → h-10`
- reduzir contraste do fundo da sidebar (mais neutro, menos “cinza painel admin”)
- labels CORE/OPERAÇÃO/ADMIN mais sutis: opacidade 50% (antes 70%)
- footer do usuário com mais respiro e alinhamento mais clean

---

# 3) KPIs — Identidade Visual Sistêmica (linha superior)

**Arquivo:** `ExecutiveKPICard.tsx`

Trocar a borda lateral grossa por identidade mais premium:

- remover `border-l-4` e qualquer accent lateral
- adicionar **micro linha superior** `border-t-[3px]` com cor por categoria:
  - **Caixa (Receita Confirmada)**: emerald
  - **Projeção (Receita Projetada)**: blue
  - **Meta do Período**: amber
  - **Aquisição (Leads no Período)**: violet

**Sombras / hover:**

- reduzir sombra: trocar `shadow-sm` por `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
- hover mais sutil: **remover translate-y**, manter apenas sombra levemente maior e transição suave

---

# 4) Gráfico de Evolução — Presença Narrativa Central

**Arquivo:** `RevenueEvolutionChart.tsx`

Dar mais presença sem poluir:

- aumentar altura: `260px → 300px`
- linha da receita: `strokeWidth 2 → 2.5`
- área/gradiente: opacidade `15% → 25%` (ainda sutil)
- reduzir gridlines:
  - `strokeDasharray "3 3" → "4 8"`
  - opacidade menor
- eixos: fontSize `11 → 12` e cor um pouco mais forte (sem ficar “preto”)
- título do bloco: `font-semibold → font-bold` e `text-sm → text-base`

**Título recomendado:**

- **“Evolução de Receita”**  
Sub: “Confirmada acumulada nos últimos 30 dias”

---

# 5) Recomendações Estratégicas — Estrutura por prioridade e impacto

**Arquivo:** `StrategicRecommendationCard.tsx`

Transformar o card em formato mais “operacional”:

- renomear título para: **“Recomendações Estratégicas Ativas”**
- cada alerta deve ter 3 linhas:
  1. **Prioridade** (Alta/Média/Baixa como micro-badge)
  2. texto principal (objetivo e curto)
  3. **Ação recomendada** (frase direta)
- adicionar badge por alerta: **Impacto estimado** (“Alto impacto”, “Impacto moderado”)
- separador sutil entre alertas: `border-b border-border/30`
- dot de status maior: `w-2.5 h-2.5` para mais presença

---

# 6) Espaçamento vertical — “Respiração institucional”

**Arquivo:** `Dashboard.tsx`

- espaçamento entre seções: `space-y-6 → space-y-8`
- gaps dos grids: `gap-4 sm:gap-5 → gap-5 sm:gap-6`
- objetivo: remover sensação de painel “cheio”, deixando mais premium

---

## Regras finais

- Não criar novos blocos.
- Não mudar ordem do layout.
- Não adicionar cores fortes ou sombras pesadas.
- Sem gradients pesados.
- Sem elementos decorativos.

**Resultado esperado:** parecer ferramenta de decisão (private equity), não painel de marketing.